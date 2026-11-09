<?php

namespace App\Services;

use App\Models\Restaurant;

/** Plate Story settings with defaults (stored in restaurants.settings.plate_story). */
class PlateStorySettings
{
    public const STYLES = ['dark', 'saffron', 'minimal'];

    public const LIMITS = ['day' => 1, 'week' => 7, 'month' => 30];

    public static function for(Restaurant $restaurant): array
    {
        $s = $restaurant->setting('plate_story', []) ?? [];

        return [
            'enabled' => (bool) ($s['enabled'] ?? true),
            'ask_after_photo' => (bool) ($s['ask_after_photo'] ?? true),
            'card_styles' => array_values(array_intersect($s['card_styles'] ?? ['dark', 'saffron'], self::STYLES)) ?: ['dark'],
            'caption' => $s['caption'] ?? ['en' => '— not a crumb left.', 'ar' => '— ولا لقمة باقية.'],
            'reward_enabled' => (bool) ($s['reward_enabled'] ?? false),
            'reward_text' => $s['reward_text'] ?? ['en' => '', 'ar' => ''],
            'reward_days' => (int) ($s['reward_days'] ?? 30),
            'reward_limit' => array_key_exists($s['reward_limit'] ?? '', self::LIMITS) ? $s['reward_limit'] : 'week',
            // Most codes the restaurant gives out per day — bounds the cost if guests farm codes from fresh devices.
            'reward_daily_cap' => (int) ($s['reward_daily_cap'] ?? 20),
        ];
    }

    public static function available(Restaurant $restaurant): bool
    {
        return self::for($restaurant)['enabled'] && PlanLimits::for($restaurant)->has('plate_story');
    }
}
