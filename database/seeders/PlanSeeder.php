<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'slug' => 'starter', 'name' => ['en' => 'Starter', 'ar' => 'المبتدئ'],
                'description' => ['en' => 'For small cafés', 'ar' => 'للمقاهي الصغيرة'],
                'price_monthly' => 3, 'price_yearly' => 30, 'max_branches' => 1, 'max_languages' => 2, 'max_items' => 150,
                'features' => ['plate_story'], 'sort_order' => 1,
            ],
            [
                'slug' => 'professional', 'name' => ['en' => 'Professional', 'ar' => 'الاحترافي'],
                'description' => ['en' => 'For restaurants', 'ar' => 'للمطاعم'],
                'price_monthly' => 6, 'price_yearly' => 60, 'max_branches' => 1, 'max_languages' => null, 'max_items' => null,
                'features' => ['table_qr', 'csv_import', 'analytics', 'premium_themes', 'plate_story', 'feedback_alerts'],
                'is_featured' => true, 'sort_order' => 2,
            ],
            [
                'slug' => 'business', 'name' => ['en' => 'Business', 'ar' => 'الأعمال'],
                'description' => ['en' => 'For multi-branch groups', 'ar' => 'للمجموعات متعددة الفروع'],
                'price_monthly' => 10, 'price_yearly' => 100, 'max_branches' => 5, 'max_languages' => null, 'max_items' => null,
                'features' => array_keys(SubscriptionPlan::FEATURES), 'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(['slug' => $plan['slug']], $plan + ['currency' => 'OMR', 'trial_days' => 14]);
        }
    }
}
