<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CustomerFeedback;
use App\Models\MenuCategory;
use App\Models\MenuEvent;
use App\Models\MenuItem;
use App\Models\QrCode;
use App\Services\PlanLimits;
use App\Support\CurrentRestaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(Request $request, CurrentRestaurant $current): Response
    {
        Gate::authorize('view-analytics');
        $restaurant = $current->get();
        $limits = PlanLimits::for($restaurant);

        $days = in_array((int) $request->query('period'), [7, 30, 90], true) ? (int) $request->query('period') : 30;
        $branchId = $request->integer('branch') ?: null;
        $tz = config('qrmenu.timezone');
        $from = Carbon::now($tz)->startOfDay()->subDays($days - 1);
        $main = $restaurant->main_language;

        $events = fn () => MenuEvent::query()
            ->where('created_at', '>=', $from->copy()->setTimezone(config('app.timezone')))
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId));

        // Raw rows are fine at MVP scale (aggregate tables can come later).
        $rows = $events()->get(['event', 'subject_type', 'subject_id', 'session_hash', 'locale', 'source', 'branch_id', 'qr_code_id', 'created_at']);
        $byEvent = $rows->groupBy('event');
        $views = $byEvent->get('menu_view', collect());
        $scans = $byEvent->get('scan', collect());

        // Daily series in restaurant local time (group once, then fill missing days with 0).
        $localDay = fn ($e) => Carbon::parse($e->created_at)->setTimezone($tz)->toDateString();
        $scansByDay = $scans->groupBy($localDay)->map->count();
        $viewsByDay = $views->groupBy($localDay)->map->count();
        $daily = collect(range(0, $days - 1))->map(function ($i) use ($from, $scansByDay, $viewsByDay) {
            $day = $from->copy()->addDays($i)->toDateString();

            return ['date' => $day, 'scans' => (int) ($scansByDay[$day] ?? 0), 'views' => (int) ($viewsByDay[$day] ?? 0)];
        });

        $top = function (string $type, int $limit) use ($byEvent) {
            $key = $type === 'item' ? 'item_view' : 'category_view';

            return $byEvent->get($key, collect())->groupBy('subject_id')->map->count()->sortDesc()->take($limit);
        };

        $topItems = $top('item', 10);
        $items = MenuItem::withTrashed()->whereIn('id', $topItems->keys())->get(['id', 'name', 'image_path', 'price'])->keyBy('id');
        $topCategories = $top('category', 8);
        $categories = MenuCategory::withTrashed()->whereIn('id', $topCategories->keys())->get(['id', 'name'])->keyBy('id');

        $languages = $views->groupBy(fn ($e) => $e->locale ?: $main)->map->count();
        $languageSwitches = $byEvent->get('language_switch', collect())->groupBy('locale')->map->count();

        $branches = Branch::orderBy('id')->get(['id', 'name']);
        $feedback = CustomerFeedback::where('created_at', '>=', $from)->selectRaw('branch_id, avg(overall_rating) as rating, count(*) as total')->groupBy('branch_id')->get()->keyBy('branch_id');

        $tables = $scans->whereNotNull('qr_code_id')->groupBy('qr_code_id')->map->count()->sortDesc()->take(8);
        $qrLabels = QrCode::whereIn('id', $tables->keys())->with('branch:id,name')->get()->keyBy('id');

        $hours = $views->groupBy(fn ($e) => (int) Carbon::parse($e->created_at)->setTimezone($tz)->format('G'))->map->count();

        return Inertia::render('restaurant/analytics/index', [
            'filters' => ['period' => $days, 'branch' => $branchId],
            'branches' => $branches,
            'fullAnalytics' => $limits->has('analytics'),
            'kpis' => [
                'scans' => $scans->count(),
                'views' => $views->count(),
                'visitors' => $views->pluck('session_hash')->unique()->count(),
                'item_views' => $byEvent->get('item_view', collect())->count(),
                'review_clicks' => $byEvent->get('review_click', collect())->count(),
                'searches' => $byEvent->get('search', collect())->count(),
            ],
            'daily' => $daily,
            'topItems' => $topItems->map(fn ($count, $id) => [
                'id' => $id,
                'name' => $items->get($id)?->translate('name', $main) ?? 'Deleted dish',
                'image_url' => $items->get($id)?->image_url,
                'views' => $count,
            ])->values(),
            'topCategories' => $topCategories->map(fn ($count, $id) => [
                'id' => $id,
                'name' => $categories->get($id)?->translate('name', $main) ?? 'Deleted category',
                'views' => $count,
            ])->values(),
            'languages' => collect($restaurant->languages)->map(fn ($code) => [
                'code' => $code,
                'name' => config("qrmenu.languages.{$code}.name") ?? $code,
                'views' => (int) ($languages[$code] ?? 0),
                'switches' => (int) ($languageSwitches[$code] ?? 0),
            ])->values(),
            'sources' => collect(['qr' => 'QR scan', 'link' => 'Link', 'story' => 'Plate Story', 'marketplace' => 'Marketplace'])
                ->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'views' => $views->where('source', $key)->count()])
                ->filter(fn ($s) => $s['views'] > 0 || in_array($s['key'], ['qr', 'link'], true))->values(),
            'hours' => collect(range(0, 23))->map(fn ($h) => ['hour' => $h, 'views' => (int) ($hours[$h] ?? 0)]),
            'tables' => $tables->map(fn ($count, $id) => [
                'label' => $qrLabels->get($id)?->table_label ?? 'Branch QR',
                'branch' => $qrLabels->get($id)?->branch?->name,
                'scans' => $count,
            ])->values(),
            'hasTables' => QrCode::whereNotNull('table_label')->exists(),
            'branchComparison' => $branchId ? [] : $branches->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'scans' => $scans->where('branch_id', $b->id)->count(),
                'views' => $views->where('branch_id', $b->id)->count(),
                'rating' => $feedback->get($b->id)?->rating ? round((float) $feedback->get($b->id)->rating, 1) : null,
                'feedback' => (int) ($feedback->get($b->id)?->total ?? 0),
            ])->values(),
        ]);
    }
}
