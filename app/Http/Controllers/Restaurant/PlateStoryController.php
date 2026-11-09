<?php

namespace App\Http\Controllers\Restaurant;

use App\Console\Commands\CleanupPlateStories;
use App\Http\Controllers\Controller;
use App\Models\MenuEvent;
use App\Models\MenuItem;
use App\Models\PlateStory;
use App\Services\ImageStore;
use App\Services\PlanLimits;
use App\Services\PlateStorySettings;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlateStoryController extends Controller
{
    public function index(Request $request, CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-plate-story');
        $restaurant = $current->get();
        $status = in_array($request->query('status'), ['pending', 'approved', 'hidden'], true) ? $request->query('status') : 'pending';
        $since = now()->subDays(30);

        return Inertia::render('restaurant/plate-story/index', [
            'settings' => PlateStorySettings::for($restaurant),
            'available' => PlanLimits::for($restaurant)->has('plate_story'),
            'instagram' => $restaurant->instagram_handle,
            'languages' => $restaurant->languages,
            'status' => $status,
            // For photos uploaded without a dish: staff pick one before approving.
            'dishes' => MenuItem::query()->orderBy('menu_category_id')->orderBy('sort_order')->get(['id', 'name'])
                ->map(fn (MenuItem $i) => ['id' => $i->id, 'name' => $i->translate('name', $restaurant->main_language)]),
            // Stories whose photos were already cleaned up are left out of the lists (they still count in the stats).
            'counts' => [
                'pending' => PlateStory::where('status', 'pending')->whereNull('photos_deleted_at')->count(),
                'approved' => PlateStory::where('status', 'approved')->whereNull('photos_deleted_at')->count(),
                'hidden' => PlateStory::where('status', 'hidden')->whereNull('photos_deleted_at')->count(),
            ],
            'retention' => [
                'pending_days' => CleanupPlateStories::PENDING_DAYS,
                'hidden_days' => CleanupPlateStories::HIDDEN_DAYS,
                'keep_per_dish' => CleanupPlateStories::KEEP_PER_DISH,
            ],
            'stats' => [
                'created' => PlateStory::where('created_at', '>=', $since)->count(),
                'shared' => PlateStory::where('created_at', '>=', $since)->whereNotNull('shared_at')->count(),
                'visits' => MenuEvent::where('event', 'menu_view')->where('source', 'story')->where('created_at', '>=', $since)->count(),
                'redeemed' => PlateStory::where('reward_redeemed_at', '>=', $since)->count(),
            ],
            'stories' => PlateStory::query()
                ->where('status', $status)
                ->whereNull('photos_deleted_at')
                ->with('item:id,name')
                ->latest()
                ->paginate(24)
                ->withQueryString()
                ->through(fn (PlateStory $s) => [
                    'id' => $s->id,
                    'status' => $s->status,
                    'dish' => $s->item?->translate('name', $restaurant->main_language),
                    'before_url' => ImageStore::url($s->before_path),
                    'after_url' => ImageStore::url($s->after_path),
                    'shared' => (bool) $s->shared_at,
                    // When the nightly clean-up will delete this photo (waiting and hidden photos only).
                    'removes_at' => match ($s->status) {
                        'pending' => $s->created_at->copy()->addDays(CleanupPlateStories::PENDING_DAYS)->toIso8601String(),
                        'hidden' => $s->updated_at->copy()->addDays(CleanupPlateStories::HIDDEN_DAYS)->toIso8601String(),
                        default => null,
                    },
                    'created_at' => $s->created_at->toIso8601String(),
                ]),
        ]);
    }

    public function updateSettings(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-plate-story');
        $data = $request->validate([
            'enabled' => ['boolean'],
            'ask_after_photo' => ['boolean'],
            'card_styles' => ['required', 'array', 'min:1'],
            'card_styles.*' => [Rule::in(PlateStorySettings::STYLES)],
            'caption' => ['array'],
            'caption.*' => ['nullable', 'string', 'max:60'],
            'reward_enabled' => ['boolean'],
            'reward_text' => ['array'],
            'reward_text.*' => ['nullable', 'string', 'max:80'],
            'reward_days' => ['required', 'integer', 'between:1,365'],
            'reward_limit' => ['required', Rule::in(array_keys(PlateStorySettings::LIMITS))],
            'reward_daily_cap' => ['required', 'integer', 'between:1,500'],
        ]);

        $restaurant = $current->get();

        if ($data['reward_enabled'] ?? false) {
            // Every menu language needs it, or guests reading that language see the reward in another one.
            $missing = array_filter($restaurant->languages, fn ($lang) => blank($data['reward_text'][$lang] ?? null));
            if ($missing) {
                $names = collect($missing)->map(fn ($l) => config("qrmenu.languages.{$l}.name") ?? strtoupper($l))->join(', ', ' and ');

                return back()->withErrors(['reward_text' => "Describe the reward in {$names}, e.g. “Free karak on your next visit”."]);
            }
        }
        $settings = $restaurant->settings ?? [];
        $settings['plate_story'] = $data;
        $restaurant->update(['settings' => $settings]);
        $this->toast('Plate Story settings saved.');

        return back();
    }

    public function moderate(Request $request, PlateStory $story, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-plate-story');
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'hidden', 'pending'])],
            'menu_item_id' => ['nullable', 'integer', Rule::exists('menu_items', 'id')->where('restaurant_id', $current->id())->whereNull('deleted_at')],
        ]);
        $data = array_filter($data, fn ($v) => $v !== null);

        // Approved photos are shown on their dish, so a photo needs a dish before it can be approved.
        if ($data['status'] === 'approved' && ! ($data['menu_item_id'] ?? $story->menu_item_id)) {
            return back()->withErrors(['menu_item_id' => 'Choose the dish in this photo before approving it.']);
        }

        $story->update($data);

        return back();
    }

    /**
     * Staff type the code a guest shows them. The first step only checks it and shows the guest's photo,
     * so staff can spot an unrelated photo; the code is used once they confirm.
     */
    public function redeem(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-plate-story');
        $data = $request->validate(['code' => ['required', 'string', 'max:20'], 'confirm' => ['boolean']]);
        $code = strtoupper(trim($data['code']));
        $story = PlateStory::with('item')->where('reward_code', $code)->first(); // tenant-scoped

        if (! $story) {
            $this->toast("No reward found for code {$code}.", 'error');
        } elseif ($story->reward_redeemed_at) {
            $this->toast("Code {$code} was already used on {$story->reward_redeemed_at->format('d M, H:i')}.", 'error');
        } elseif ($story->reward_expires_at && $story->reward_expires_at->isPast()) {
            $this->toast("Code {$code} expired on {$story->reward_expires_at->format('d M')}.", 'error');
        } elseif ($story->status === 'hidden') {
            $this->toast("This photo was hidden, so the reward for code {$code} is void.", 'error');
        } elseif (! ($data['confirm'] ?? false)) {
            Inertia::flash('rewardCheck', [
                'code' => $code,
                'photo_url' => ImageStore::url($story->before_path),
                'dish' => $story->item?->translate('name', $current->get()->main_language),
                'created_at' => $story->created_at->toIso8601String(),
            ]);
        } else {
            $story->update(['reward_redeemed_at' => now()]);
            $this->toast("Code {$code} redeemed.");
        }

        return back();
    }
}
