<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CustomerFeedback;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class FeedbackController extends Controller
{
    public const PERIODS = ['7' => 7, '30' => 30, '90' => 90, '365' => 365];

    public function index(Request $request, CurrentRestaurant $current): Response
    {
        Gate::authorize('view-feedback');
        $restaurant = $current->get();

        $days = self::PERIODS[$request->query('period', '30')] ?? 30;
        $branchId = $request->integer('branch') ?: null;
        $rating = $request->query('rating'); // low | high | null
        $status = $request->query('status'); // open | resolved | null

        $base = fn () => CustomerFeedback::query()
            ->where('created_at', '>=', now()->subDays($days))
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId));

        $averages = $base()->selectRaw('count(*) as total, avg(overall_rating) as overall, avg(food_rating) as food, avg(service_rating) as service, avg(cleanliness_rating) as cleanliness, count(food_rating) as food_count, count(service_rating) as service_count, count(cleanliness_rating) as cleanliness_count')->first();

        $distribution = $base()->selectRaw('overall_rating as stars, count(*) as total')->groupBy('overall_rating')->pluck('total', 'stars');

        // Monthly trend over the last 6 months (independent of the period filter).
        $since = now()->startOfMonth()->subMonths(5);
        $monthly = CustomerFeedback::query()
            ->where('created_at', '>=', $since)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->get(['overall_rating', 'created_at'])
            ->groupBy(fn ($f) => $f->created_at->format('Y-m'));
        $trend = collect(range(0, 5))->map(function ($i) use ($since, $monthly) {
            $month = $since->copy()->addMonths($i);
            $rows = $monthly->get($month->format('Y-m'), collect());

            return ['month' => $month->format('M'), 'average' => $rows->count() ? round($rows->avg('overall_rating'), 2) : null, 'count' => $rows->count()];
        });

        $feedback = $base()
            ->with(['branch:id,name', 'qrCode:id,table_label'])
            ->when($rating === 'low', fn ($q) => $q->where('overall_rating', '<=', 2))
            ->when($rating === 'high', fn ($q) => $q->where('overall_rating', '>=', 4))
            ->when($status === 'open', fn ($q) => $q->whereNull('resolved_at'))
            ->when($status === 'resolved', fn ($q) => $q->whereNotNull('resolved_at'))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('restaurant/feedback/index', [
            'filters' => ['period' => (string) $days, 'branch' => $branchId, 'rating' => $rating, 'status' => $status],
            'branches' => Branch::orderBy('id')->get(['id', 'name']),
            'summary' => [
                'total' => (int) $averages->total,
                'overall' => $averages->overall ? round((float) $averages->overall, 2) : null,
                'food' => $averages->food ? round((float) $averages->food, 2) : null,
                'service' => $averages->service ? round((float) $averages->service, 2) : null,
                'cleanliness' => $averages->cleanliness ? round((float) $averages->cleanliness, 2) : null,
                // Food, service and cleanliness are optional, so each has its own number of ratings.
                'counts' => ['food' => (int) $averages->food_count, 'service' => (int) $averages->service_count, 'cleanliness' => (int) $averages->cleanliness_count],
                'distribution' => collect([5, 4, 3, 2, 1])->map(fn ($s) => ['stars' => $s, 'total' => (int) ($distribution[$s] ?? 0)]),
                'open_low' => $base()->where('overall_rating', '<=', 2)->whereNull('resolved_at')->count(),
            ],
            'trend' => $trend,
            'feedback' => $feedback,
            'alerts' => [
                'threshold' => (int) $restaurant->setting('feedback.alert_threshold', 2),
                'email' => $restaurant->setting('feedback.alert_email'),
                'owner_emails' => $restaurant->users()->wherePivot('role', 'owner')->pluck('email'),
            ],
            'canManage' => $request->user()->can('manage-restaurant'),
            'highlight' => $request->integer('highlight') ?: null,
        ]);
    }

    public function resolve(Request $request, CustomerFeedback $feedback): RedirectResponse
    {
        Gate::authorize('view-feedback');
        $feedback->update(['resolved_at' => $request->boolean('resolved', true) ? now() : null]);

        return back();
    }

    public function updateAlerts(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-restaurant');
        $data = $request->validate([
            'threshold' => ['required', 'integer', 'between:0,4'],
            'email' => ['nullable', 'email', 'max:120'],
        ]);

        $restaurant = $current->get();
        $settings = $restaurant->settings ?? [];
        $settings['feedback'] = [
            'alert_threshold' => $data['threshold'],
            'alert_email' => $data['email'] ?? null,
        ];
        $restaurant->update(['settings' => $settings]);
        $this->toast('Alert settings saved.');

        return back();
    }
}
