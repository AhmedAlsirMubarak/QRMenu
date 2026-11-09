<?php

namespace App\Actions\Restaurants;

use App\Enums\RestaurantRole;
use App\Models\Branch;
use App\Models\QrCode;
use App\Models\Restaurant;
use App\Models\SiteSetting;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creates a restaurant with its owner, a main branch, a branch QR code and a trial
 * subscription — everything a new client needs to start building their menu.
 */
class CreateRestaurant
{
    public function handle(User $owner, array $data): Restaurant
    {
        return DB::transaction(function () use ($owner, $data) {
            $languages = array_values(array_unique(array_merge([$data['main_language']], $data['languages'] ?? [])));

            $restaurant = Restaurant::create([
                'name' => $data['name'],
                'slug' => $this->uniqueSlug($data['slug'] ?? $data['name']),
                'main_language' => $data['main_language'],
                'languages' => $languages,
                'currency' => $data['currency'],
                'phone' => $data['phone'] ?? null,
                'theme' => 'saffron',
                'status' => 'active',
                'settings' => [
                    'plate_story' => ['enabled' => true, 'ask_after_photo' => true, 'card_styles' => ['dark', 'saffron']],
                    'feedback' => ['alert_threshold' => 2],
                ],
            ]);

            $restaurant->users()->attach($owner->id, ['role' => RestaurantRole::Owner->value]);
            $owner->forceFill(['current_restaurant_id' => $restaurant->id])->save();

            $branch = Branch::create([
                'restaurant_id' => $restaurant->id,
                'name' => $data['branch_name'] ?? 'Main branch',
                'slug' => 'main',
                'city' => $data['city'] ?? null,
            ]);

            QrCode::create(['restaurant_id' => $restaurant->id, 'branch_id' => $branch->id]);

            $plan = isset($data['plan_id'])
                ? SubscriptionPlan::find($data['plan_id'])
                : SubscriptionPlan::query()->where('is_active', true)->ordered()->first();

            if ($plan) {
                $trialDays = $plan->trial_days ?: (int) SiteSetting::get('trial_days', 14);

                Subscription::create([
                    'restaurant_id' => $restaurant->id,
                    'subscription_plan_id' => $plan->id,
                    'billing_cycle' => 'monthly',
                    'price' => $plan->price_monthly,
                    'currency' => $plan->currency,
                    'status' => 'trialing',
                    'starts_at' => now(),
                    'trial_ends_at' => now()->addDays($trialDays),
                ]);
            }

            return $restaurant;
        });
    }

    protected function uniqueSlug(string $value): string
    {
        $base = Str::slug($value) ?: 'restaurant';
        $slug = $base;
        $i = 2;

        while (Restaurant::withTrashed()->where('slug', $slug)->exists() || in_array($slug, self::RESERVED, true)) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    /** Slugs that would clash with platform routes. */
    public const RESERVED = ['admin', 'app', 'login', 'logout', 'register', 'dashboard', 'onboarding', 'settings',
        'blog', 'clients', 'marketplace', 'pricing', 'api', 'up', 'storage', 'build', 'm', 'q', 'user',
        'forgot-password', 'reset-password', 'email', 'two-factor-challenge', 'passkeys', 'confirm-password',
        'about', 'contact', 'terms', 'privacy', 'help', 'support', 'menu', 'examples', 'ads', 'discover'];
}
