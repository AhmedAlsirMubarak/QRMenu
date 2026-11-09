<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerFeedback;
use App\Models\MenuEvent;
use App\Models\PlateStory;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\CarbonInterface;
use Inertia\Inertia;
use Inertia\Response;

/** Platform-wide usage. Aggregated in SQL so it stays fast as the platform grows. */
class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $days = in_array((int) $request->query('period'), [7, 30, 90], true) ? (int) $request->query('period') : 30;
        $from = now()->startOfDay()->subDays($days - 1);
        $prevFrom = $from->copy()->subDays($days);

        $events = fn () => MenuEvent::withoutRestaurantScope()->where('created_at', '>=', $from);

        $daily = $events()->whereIn('event', ['scan', 'menu_view'])
            ->selectRaw('DATE(created_at) as day, event, count(*) as total')
            ->groupBy('day', 'event')->get()
            ->groupBy('day');
        $series = collect(range(0, $days - 1))->map(function ($i) use ($from, $daily) {
            $day = $from->copy()->addDays($i)->toDateString();
            $rows = $daily->get($day, collect())->pluck('total', 'event');

            return ['date' => $day, 'scans' => (int) ($rows['scan'] ?? 0), 'views' => (int) ($rows['menu_view'] ?? 0)];
        });

        $count = fn (string $event, CarbonInterface $start, ?CarbonInterface $end = null) => MenuEvent::withoutRestaurantScope()->where('event', $event)
            ->where('created_at', '>=', $start)->when($end, fn ($q) => $q->where('created_at', '<', $end))->count();
        $change = fn (int $now, int $before) => $before > 0 ? (int) round(($now - $before) / $before * 100) : null;

        $scans = $count('scan', $from);
        $views = $count('menu_view', $from);
        $prevScans = $count('scan', $prevFrom, $from);

        $activeIds = $events()->where('event', 'menu_view')->distinct()->pluck('restaurant_id');

        $top = $events()->where('event', 'menu_view')
            ->selectRaw('restaurant_id, count(*) as total')->groupBy('restaurant_id')->orderByDesc('total')->limit(10)->get();
        $names = Restaurant::withTrashed()->whereIn('id', $top->pluck('restaurant_id'))->get(['id', 'name', 'slug', 'logo_path'])->keyBy('id');

        $languages = $events()->where('event', 'menu_view')
            ->selectRaw("coalesce(locale, '?') as locale, count(*) as total")->groupBy('locale')->orderByDesc('total')->get();

        $sources = $events()->where('event', 'menu_view')
            ->selectRaw("coalesce(source, 'link') as source, count(*) as total")->groupBy('source')->orderByDesc('total')->get();

        $signups = Restaurant::withTrashed()->where('created_at', '>=', now()->startOfMonth()->subMonths(11))
            ->get(['created_at'])->groupBy(fn ($r) => $r->created_at->format('Y-m'))->map->count();
        $signupSeries = collect(range(11, 0))->map(function ($i) use ($signups) {
            $m = now()->startOfMonth()->subMonths($i);

            return ['month' => $m->format('M y'), 'restaurants' => (int) ($signups[$m->format('Y-m')] ?? 0)];
        });

        $feedback = CustomerFeedback::withoutRestaurantScope()->where('created_at', '>=', $from);
        $languageNames = collect(config('qrmenu.languages'))->map(fn ($l) => $l['name']);

        // Disk use, measured nightly by plate-stories:cleanup.
        $usage = \Illuminate\Support\Facades\Cache::get('storage.usage');
        $perRestaurant = collect($usage['restaurants'] ?? []);
        $storageNames = Restaurant::withTrashed()->whereIn('id', $perRestaurant->sortByDesc('total')->keys()->take(10))->pluck('name', 'id');

        return Inertia::render('admin/analytics/index', [
            'storage' => $usage ? [
                'measured_at' => $usage['measured_at'],
                'total' => (int) $perRestaurant->sum('total'),
                'stories' => (int) $perRestaurant->sum('stories'),
                'top' => $perRestaurant->sortByDesc('total')->take(10)->map(fn ($u, $id) => [
                    'label' => $storageNames[$id] ?? "#{$id}",
                    'value' => (int) $u['total'],
                    'hint' => $u['total'] ? round($u['stories'] / $u['total'] * 100).'% Plate Story' : null,
                ])->values(),
            ] : null,
            'period' => $days,
            'kpis' => [
                'scans' => $scans,
                'scans_change' => $change($scans, $prevScans),
                'views' => $views,
                'active_restaurants' => $activeIds->count(),
                'total_restaurants' => Restaurant::where('status', 'active')->count(),
                'new_restaurants' => Restaurant::where('created_at', '>=', $from)->count(),
                'new_users' => User::where('created_at', '>=', $from)->count(),
                'feedback_count' => (clone $feedback)->count(),
                'feedback_avg' => round((float) (clone $feedback)->avg('overall_rating'), 1),
                'stories' => PlateStory::withoutRestaurantScope()->where('created_at', '>=', $from)->count(),
                'story_shares' => $count('plate_story_share', $from),
            ],
            'daily' => $series,
            'signups' => $signupSeries,
            'topRestaurants' => $top->map(fn ($r) => [
                'label' => $names->get($r->restaurant_id)?->name ?? '—',
                'value' => (int) $r->total,
                'hint' => '/'.($names->get($r->restaurant_id)?->slug ?? ''),
                'image' => $names->get($r->restaurant_id)?->logo_url,
            ])->values(),
            'languages' => $languages->map(fn ($l) => ['label' => $languageNames[$l->locale] ?? strtoupper($l->locale), 'value' => (int) $l->total]),
            'sources' => $sources->map(fn ($s) => ['label' => ucfirst($s->source), 'value' => (int) $s->total]),
            'inactive' => Restaurant::where('status', 'active')->whereNotIn('id', $activeIds)->latest()->limit(8)->get(['id', 'name', 'slug', 'created_at'])
                ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'slug' => $r->slug, 'created_at' => $r->created_at->toDateString()]),
        ]);
    }
}
