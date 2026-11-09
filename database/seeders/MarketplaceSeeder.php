<?php

namespace Database\Seeders;

use App\Models\AdCampaign;
use App\Models\Restaurant;
use Illuminate\Database\Seeder;

/** Demo ads for the Marketplace page (local/dev only). */
class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        if (AdCampaign::exists()) {
            return;
        }

        $demo = Restaurant::where('slug', 'bait-al-saffron')->first();

        if ($demo) {
            AdCampaign::create([
                'advertiser_type' => 'restaurant', 'restaurant_id' => $demo->id, 'slot' => 'offer',
                'title' => ['en' => '20% off breakfast', 'ar' => 'خصم ٢٠٪ على الفطور'],
                'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth(), 'price' => 15, 'currency' => 'OMR',
            ]);
        }

        AdCampaign::create([
            'advertiser_type' => 'external', 'advertiser_name' => 'Muscat Food Festival', 'slot' => 'banner',
            'title' => ['en' => 'Muscat Food Festival · this weekend', 'ar' => 'مهرجان مسقط للطعام · هذا الأسبوع'],
            'subtitle' => ['en' => '60 kitchens, live cooking and music at Qurum Park.', 'ar' => '٦٠ مطبخاً وطهي مباشر وموسيقى في حديقة القرم.'],
            'link_url' => 'https://example.com', 'starts_at' => now()->subDay(), 'ends_at' => now()->addWeeks(2), 'price' => 120, 'currency' => 'OMR',
        ]);
    }
}
