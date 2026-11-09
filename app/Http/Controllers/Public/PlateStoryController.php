<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\MenuItem;
use App\Models\PlateStory;
use App\Models\Restaurant;
use App\Services\ImageOptimizer;
use App\Services\PlateStorySettings;
use App\Services\PublicMenu\VisitTracker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Guest side of Plate Story: upload the before/after photos.
 * The story card itself is made and shared on the guest's phone — the server never needs a copy.
 */
class PlateStoryController extends Controller
{
    public function store(Request $request, string $restaurant): JsonResponse
    {
        $model = Restaurant::where('slug', $restaurant)->where('status', 'active')->first();
        abort_unless($model && ($model->subscription?->isUsable() ?? false) && PlateStorySettings::available($model), 404);

        $settings = PlateStorySettings::for($model);

        $data = $request->validate([
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->where('restaurant_id', $model->id)],
            'menu_item_id' => ['nullable', 'integer', Rule::exists('menu_items', 'id')->where('restaurant_id', $model->id)->whereNull('deleted_at')],
            'style' => ['required', Rule::in($settings['card_styles'])],
            'before' => ['required', 'image', 'max:8192'],
            'after' => ['nullable', 'image', 'max:8192'],
        ]);

        $folder = 'stories/'.now()->format('Y-m');
        $hash = VisitTracker::sessionHash($request);

        $story = PlateStory::create([
            'restaurant_id' => $model->id,
            'branch_id' => $data['branch_id'],
            'menu_item_id' => $data['menu_item_id'] ?? null,
            'before_path' => ImageOptimizer::store($request->file('before'), $model->id, $folder),
            'after_path' => $request->hasFile('after') ? ImageOptimizer::store($request->file('after'), $model->id, $folder) : null,
            'card_style' => $data['style'],
            'status' => 'pending',
            'session_hash' => $hash,
        ]);

        // Remember this guest's own stories so only they can mark them as shared.
        $request->session()->push('plate_story.mine', $story->id);

        return response()->json([
            'id' => $story->id,
            'reward' => $this->reward($model, $story, $settings, $request),
        ]);
    }

    /** Rewards are for sharing on social media only — never for reviews or ratings. */
    protected function reward(Restaurant $restaurant, PlateStory $story, array $settings, Request $request): ?array
    {
        if (! $settings['reward_enabled'] || ! array_filter($settings['reward_text'] ?? [])) {
            return null;
        }

        // Limit per guest device: one reward per day / week / month. Kept in an encrypted cookie that
        // lives as long as the window — the session expires after a couple of hours.
        $days = PlateStorySettings::LIMITS[$settings['reward_limit']];
        $deviceKey = 'ps_reward_'.$restaurant->id;
        $lastAt = $request->cookie($deviceKey);
        if (is_string($lastAt) && now()->subDays($days)->lt($lastAt)) {
            return null;
        }

        // Clearing cookies resets the device limit, so the restaurant's daily cap bounds what can be farmed.
        $today = now(config('qrmenu.timezone'))->startOfDay()->utc(); // the restaurant's day, compared in the stored (UTC) time
        $issuedToday = PlateStory::withoutRestaurantScope()->where('restaurant_id', $restaurant->id)
            ->whereNotNull('reward_code')->where('created_at', '>=', $today)->count();
        if ($issuedToday >= $settings['reward_daily_cap']) {
            return null;
        }

        do {
            $code = strtoupper(Str::random(3).'-'.random_int(100, 999));
        } while (PlateStory::withoutRestaurantScope()->where('reward_code', $code)->exists());

        $story->update(['reward_code' => $code, 'reward_expires_at' => now()->addDays($settings['reward_days'])]);
        Cookie::queue($deviceKey, now()->toIso8601String(), $days * 1440);

        return [
            'code' => $code,
            'text' => $settings['reward_text'],
            'expires_at' => $story->reward_expires_at->toDateString(),
        ];
    }
}
