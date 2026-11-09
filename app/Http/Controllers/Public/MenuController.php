<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CustomerFeedback;
use App\Models\QrCode;
use App\Models\Restaurant;
use App\Services\PublicMenu\MenuPresenter;
use App\Services\PublicMenu\VisitTracker;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    /** Permanent QR link: /q/{code} keeps working even if the restaurant renames its menu link. */
    public function qr(Request $request, string $code): RedirectResponse
    {
        $qr = QrCode::withoutRestaurantScope()->where('code', $code)->with(['restaurant', 'branch'])->first();
        abort_unless($qr && $qr->restaurant && $qr->branch, 404);

        VisitTracker::recordScan($request, $qr);
        $request->session()->put("menu.qr.{$qr->restaurant_id}", $qr->id);

        return redirect()->route('menu.show', ['restaurant' => $qr->restaurant->slug, 'branch' => $qr->branch->slug]);
    }

    public function show(Request $request, string $restaurant): Response
    {
        $model = Restaurant::where('slug', $restaurant)->first();
        abort_unless($model, 404);

        if (! $this->isLive($model)) {
            return Inertia::render('public/unavailable', ['name' => $model->name]);
        }

        app(CurrentRestaurant::class)->set($model);

        $branch = Branch::where('is_active', true)
            ->when($request->query('branch'), fn ($q, $slug) => $q->where('slug', $slug))
            ->orderBy('id')->first()
            ?? Branch::where('is_active', true)->orderBy('id')->firstOrFail();

        $qrId = $request->session()->get("menu.qr.{$model->id}");
        $qr = $qrId ? QrCode::whereKey($qrId)->where('branch_id', $branch->id)->first() : null;

        VisitTracker::record($request, $model, 'menu_view', [
            'branch_id' => $branch->id,
            'qr_code_id' => $qr?->id,
            'source' => $qr ? 'qr' : (in_array($request->query('src'), ['story', 'marketplace'], true) ? $request->query('src') : 'link'),
        ]);

        return Inertia::render('public/menu', (new MenuPresenter($model, $branch, $qr))->toArray());
    }

    /** Lightweight analytics beacon (navigator.sendBeacon) — CSRF-exempt, throttled. */
    public function event(Request $request, string $restaurant): HttpResponse
    {
        $model = Restaurant::where('slug', $restaurant)->first();

        $data = $request->validate([
            'event' => ['required', Rule::in(['category_view', 'item_view', 'search', 'review_click', 'language_switch', 'plate_story_share'])],
            'subject_id' => ['nullable', 'integer'],
            'branch_id' => ['nullable', 'integer'],
            'locale' => ['nullable', 'string', 'max:8'],
        ]);

        if ($model && $this->isLive($model)) {
            $branchId = isset($data['branch_id']) && Branch::withoutRestaurantScope()->where('restaurant_id', $model->id)->whereKey($data['branch_id'])->exists()
                ? $data['branch_id'] : null;

            VisitTracker::record($request, $model, $data['event'], [
                'branch_id' => $branchId,
                'subject_type' => match ($data['event']) { 'category_view' => 'category', 'item_view' => 'item', 'plate_story_share' => 'plate_story', default => null },
                'subject_id' => $data['subject_id'] ?? null,
                'locale' => $data['locale'] ?? null,
            ]);

            if ($data['event'] === 'plate_story_share' && in_array((int) ($data['subject_id'] ?? 0), $request->session()->get('plate_story.mine', []), true)) {
                \App\Models\PlateStory::withoutRestaurantScope()
                    ->where('restaurant_id', $model->id)
                    ->whereKey($data['subject_id'])
                    ->whereNull('shared_at')
                    ->update(['shared_at' => now()]);
            }
        }

        return response()->noContent();
    }

    public function feedback(Request $request, string $restaurant): RedirectResponse
    {
        $model = Restaurant::where('slug', $restaurant)->first();
        abort_unless($model && $this->isLive($model), 404);

        $data = $request->validate([
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->where('restaurant_id', $model->id)],
            'food_rating' => ['nullable', 'integer', 'between:1,5'],
            'service_rating' => ['nullable', 'integer', 'between:1,5'],
            'cleanliness_rating' => ['nullable', 'integer', 'between:1,5'],
            'overall_rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'is_anonymous' => ['boolean'],
            'contact' => ['nullable', 'string', 'max:120'],
            'locale' => ['nullable', 'string', 'max:8'],
            'website' => ['prohibited'], // honeypot
        ]);

        $qrId = $request->session()->get("menu.qr.{$model->id}");

        $feedback = CustomerFeedback::create($data + [
            'restaurant_id' => $model->id,
            'qr_code_id' => $qrId,
            'is_anonymous' => $request->boolean('is_anonymous', true),
            'contact' => $request->boolean('is_anonymous', true) ? null : ($data['contact'] ?? null),
        ]);

        \App\Jobs\SendLowRatingAlert::dispatchAfterResponse($feedback->id);

        return back();
    }

    protected function isLive(Restaurant $restaurant): bool
    {
        return $restaurant->isActive() && ($restaurant->subscription?->isUsable() ?? false);
    }
}
