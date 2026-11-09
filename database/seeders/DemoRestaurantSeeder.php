<?php

namespace Database\Seeders;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Illuminate\Database\Seeder;

class DemoRestaurantSeeder extends Seeder
{
    public function run(): void
    {
        if (Restaurant::where('slug', 'bait-al-saffron')->exists()) {
            return;
        }

        $owner = User::firstOrCreate(
            ['email' => 'owner@qrmenu.test'],
            ['name' => 'Demo Owner', 'password' => 'password', 'email_verified_at' => now()],
        );

        $restaurant = app(CreateRestaurant::class)->handle($owner, [
            'name' => 'Bait Al Saffron', 'slug' => 'bait-al-saffron', 'main_language' => 'en',
            'languages' => ['ar'], 'currency' => 'OMR', 'city' => 'Muscat', 'branch_name' => 'Al Mouj',
            'plan_id' => \App\Models\SubscriptionPlan::where('slug', 'professional')->value('id'),
        ]);
        $restaurant->update([
            'google_rating' => 4.7, 'instagram_handle' => 'baitalsaffron', 'is_showcased' => true,
            'marketplace_listed' => true, 'venue_type' => 'restaurant', 'cuisines' => ['Omani', 'Breakfast', 'Coffee'],
            'tagline' => ['en' => 'Omani kitchen & coffee', 'ar' => 'مطبخ عماني وقهوة'],
        ]);
        // Keep the demo live (a plain trial would go offline after 14 days).
        $restaurant->subscription?->update(['status' => 'active', 'ends_at' => now()->addYear()]);

        $restaurant->branches()->first()?->update(['area' => 'Al Mouj', 'latitude' => 23.6197, 'longitude' => 58.2593]);

        app(CurrentRestaurant::class)->set($restaurant);

        $menu = [
            [['en' => 'Breakfast', 'ar' => 'فطور'], [
                [['en' => 'Shakshuka', 'ar' => 'شكشوكة'], ['en' => 'Eggs poached in spiced tomato, warm bread', 'ar' => 'بيض مطهو في صلصة طماطم متبلة مع خبز'], 2.4, ['vegetarian'], ['eggs', 'gluten']],
                [['en' => 'Omani Breakfast Platter', 'ar' => 'فطور عماني'], ['en' => 'Chabab, honey, dates, cheese, eggs', 'ar' => 'خبز الرخال، عسل، تمر، جبن، بيض'], 3.8, [], ['gluten', 'dairy', 'eggs']],
                [['en' => 'Za’atar Manakish', 'ar' => 'مناقيش زعتر'], ['en' => 'Stone-baked flatbread, olive oil', 'ar' => 'خبز بالفرن الحجري وزيت الزيتون'], 1.2, ['vegan'], ['gluten', 'sesame']],
            ]],
            [['en' => 'Grills', 'ar' => 'مشاوي'], [
                [['en' => 'Mixed Grill', 'ar' => 'مشاوي مشكلة'], ['en' => 'Lamb kofta, shish tawook, lamb chops', 'ar' => 'كفتة، شيش طاووق، ريش غنم'], 6.5, ['spicy'], []],
                [['en' => 'Shuwa', 'ar' => 'شواء عماني'], ['en' => 'Slow-roasted lamb, saffron rice', 'ar' => 'لحم ضأن مشوي ببطء مع أرز بالزعفران'], 7.2, [], []],
            ]],
            [['en' => 'Drinks', 'ar' => 'مشروبات'], [
                [['en' => 'Karak Chai', 'ar' => 'شاي كرك'], ['en' => 'Cardamom, saffron, evaporated milk', 'ar' => 'هيل، زعفران، حليب'], 0.5, ['vegetarian'], ['dairy']],
                [['en' => 'Fresh Lemon Mint', 'ar' => 'ليمون بالنعناع'], ['en' => 'Blended with ice', 'ar' => 'مخفوق مع الثلج'], 1.2, ['vegan'], []],
            ]],
        ];

        foreach ($menu as $ci => [$catName, $items]) {
            $category = MenuCategory::create(['name' => $catName, 'sort_order' => $ci]);

            foreach ($items as $ii => [$name, $desc, $price, $dietary, $allergens]) {
                MenuItem::create([
                    'menu_category_id' => $category->id, 'name' => $name, 'description' => $desc, 'price' => $price,
                    'dietary_tags' => $dietary, 'allergens' => $allergens, 'sort_order' => $ii, 'is_featured' => $ii === 0,
                    'sku' => strtoupper(substr($catName['en'], 0, 3)).'-'.str_pad((string) ($ii + 1), 3, '0', STR_PAD_LEFT),
                ]);
            }
        }

        app(CurrentRestaurant::class)->set(null);
    }
}
