<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\AdCampaign;
use App\Models\Branch;
use App\Models\CustomerFeedback;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MarketplaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
    }

    protected function listed(string $name, string $city, array $extra = []): Restaurant
    {
        $owner = User::factory()->create();
        $r = app(CreateRestaurant::class)->handle($owner, [
            'name' => $name, 'main_language' => 'en', 'currency' => 'OMR', 'city' => $city,
            'plan_id' => SubscriptionPlan::where('slug', 'professional')->value('id'),
        ]);
        app(CurrentRestaurant::class)->set(null);
        $r->update(['marketplace_listed' => true] + $extra);

        return $r;
    }

    protected function rate(Restaurant $r, int $stars, int $times): void
    {
        $branch = Branch::withoutRestaurantScope()->where('restaurant_id', $r->id)->value('id');
        foreach (range(1, $times) as $_) {
            CustomerFeedback::withoutRestaurantScope()->create(['restaurant_id' => $r->id, 'branch_id' => $branch, 'overall_rating' => $stars]);
        }
    }

    public function test_only_listed_live_restaurants_appear_sorted_by_rating(): void
    {
        $good = $this->listed('Good Grill', 'Muscat');
        $ok = $this->listed('Okay Café', 'Muscat', ['venue_type' => 'cafe']);
        $this->listed('Sohar Bites', 'Sohar');
        $this->listed('Hidden', 'Muscat')->update(['marketplace_listed' => false]);
        $this->listed('Suspended', 'Muscat')->update(['status' => 'suspended']);
        $this->rate($good, 5, 3);
        $this->rate($ok, 3, 4);

        $this->get('/marketplace')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('website/marketplace')
            ->where('listings.total', 3)
            ->where('listings.data.0.name', 'Good Grill')
            ->where('listings.data.0.rating', 5));

        $this->get('/marketplace?city=Muscat&type=cafe')->assertInertia(fn (Assert $page) => $page
            ->where('listings.total', 1)->where('listings.data.0.name', 'Okay Café'));

        $this->get('/marketplace?q=sohar')->assertInertia(fn (Assert $page) => $page
            ->where('listings.total', 1)->where('listings.data.0.name', 'Sohar Bites'));
    }

    public function test_nearest_sort_uses_branch_location(): void
    {
        $far = $this->listed('Far Away', 'Salalah');
        $near = $this->listed('Next Door', 'Muscat');
        Branch::withoutRestaurantScope()->where('restaurant_id', $far->id)->update(['latitude' => 17.0194, 'longitude' => 54.0897]);
        Branch::withoutRestaurantScope()->where('restaurant_id', $near->id)->update(['latitude' => 23.6100, 'longitude' => 58.5400]);

        $this->get('/marketplace?sort=nearest&lat=23.59&lng=58.40')->assertInertia(fn (Assert $page) => $page
            ->where('filters.sort', 'nearest')
            ->where('listings.data.0.name', 'Next Door'));
    }

    public function test_sponsored_listing_is_pinned_and_ads_count_impressions_and_clicks(): void
    {
        $a = $this->listed('Alpha', 'Muscat');
        $this->rate($a, 5, 5);
        $sponsor = $this->listed('Sponsor Café', 'Muscat');

        $ad = AdCampaign::create(['advertiser_type' => 'restaurant', 'restaurant_id' => $sponsor->id, 'slot' => 'sponsored', 'title' => ['en' => 'Try us'], 'starts_at' => now()->subDay(), 'ends_at' => now()->addDay(), 'price' => 10]);
        $banner = AdCampaign::create(['advertiser_type' => 'external', 'advertiser_name' => 'Festival', 'slot' => 'banner', 'title' => ['en' => 'Food fest'], 'link_url' => 'https://example.com', 'starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        AdCampaign::create(['advertiser_type' => 'external', 'advertiser_name' => 'Old', 'slot' => 'banner', 'title' => ['en' => 'Ended'], 'link_url' => 'https://example.com', 'starts_at' => now()->subMonth(), 'ends_at' => now()->subWeek()]);

        $this->get('/marketplace')->assertInertia(fn (Assert $page) => $page
            ->has('sponsored', 1)
            ->where('sponsored.0.name', 'Sponsor Café')
            ->where('listings.total', 1)
            ->where('banner.id', $banner->id));
        $this->get('/marketplace'); // same visitor: not counted twice

        $this->assertSame(1, $ad->fresh()->impressions);
        $this->assertSame(1, $banner->fresh()->impressions);

        $this->get("/ads/{$ad->id}/click")->assertRedirect('/'.$sponsor->slug.'?src=marketplace');
        $this->get("/ads/{$banner->id}/click")->assertRedirect('https://example.com');
        $this->assertSame(1, $ad->fresh()->clicks);
    }

    public function test_campaign_artwork_replaces_the_restaurant_cover_on_its_card(): void
    {
        $r = $this->listed('Art Café', 'Muscat');
        AdCampaign::create(['advertiser_type' => 'restaurant', 'restaurant_id' => $r->id, 'slot' => 'sponsored', 'title' => ['en' => 'New season'], 'image_path' => 'ads/art.jpg', 'starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);

        $this->get('/marketplace')->assertInertia(fn (Assert $page) => $page
            ->where('sponsored.0.cover_url', \Illuminate\Support\Facades\Storage::disk('public')->url('ads/art.jpg')));
    }

    public function test_higher_priority_campaigns_show_first_and_extra_ones_wait(): void
    {
        foreach ([1 => 'Low', 10 => 'Top', 5 => 'Normal', 8 => 'High'] as $priority => $name) {
            $r = $this->listed($name, 'Muscat');
            AdCampaign::create(['advertiser_type' => 'restaurant', 'restaurant_id' => $r->id, 'slot' => 'sponsored', 'priority' => $priority, 'title' => ['en' => $name], 'starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        }

        $this->get('/marketplace')->assertInertia(fn (Assert $page) => $page
            ->has('sponsored', 3)
            ->where('sponsored.0.name', 'Top')
            ->where('sponsored.1.name', 'High')
            ->where('sponsored.2.name', 'Normal'));

        $admin = User::factory()->create();
        $admin->forceFill(['is_super_admin' => true])->save();
        $this->actingAs($admin)->get('/admin/marketplace')->assertInertia(fn (Assert $page) => $page
            ->where('lineup.1.slot', 'sponsored')
            ->where('lineup.1.ads.0.state', 'shown')
            ->where('lineup.1.ads.3.title', 'Low')
            ->where('lineup.1.ads.3.state', 'waiting'));
    }

    public function test_restaurant_opts_in_from_profile(): void
    {
        $owner = User::factory()->create();
        $r = app(CreateRestaurant::class)->handle($owner, ['name' => 'Opt In', 'main_language' => 'en', 'currency' => 'OMR']);
        app(CurrentRestaurant::class)->set(null);

        $this->actingAs($owner)->put('/app/profile/marketplace', ['marketplace_listed' => true, 'venue_type' => 'cafe', 'cuisines' => ['Coffee', ' Coffee ', 'Cake']])
            ->assertSessionHasNoErrors();

        $r->refresh();
        $this->assertTrue($r->marketplace_listed);
        $this->assertSame(['Coffee', 'Cake'], $r->cuisines);
    }

    public function test_admin_creates_campaign_with_invoice_and_external_cannot_be_sponsored(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_super_admin' => true])->save();
        $r = $this->listed('Advertiser', 'Muscat');

        $this->actingAs($admin)->post('/admin/marketplace/ads', [
            'advertiser_type' => 'restaurant', 'restaurant_id' => $r->id, 'slot' => 'sponsored', 'title' => ['en' => 'Top spot'],
            'starts_at' => now()->toDateString(), 'ends_at' => now()->addMonth()->toDateString(), 'price' => '25.000', 'currency' => 'OMR',
            'record_payment' => true, 'payment_status' => 'paid',
        ])->assertSessionHasNoErrors();

        $ad = AdCampaign::first();
        $this->assertNotNull($ad->payment_id);
        $this->assertSame('advertising', Payment::find($ad->payment_id)->type);
        $this->assertSame('live', $ad->status);

        $this->actingAs($admin)->post('/admin/marketplace/ads', [
            'advertiser_type' => 'external', 'advertiser_name' => 'X', 'link_url' => 'https://x.com', 'slot' => 'sponsored', 'title' => ['en' => 'No'],
            'starts_at' => now()->toDateString(), 'ends_at' => now()->addDay()->toDateString(), 'price' => 0, 'currency' => 'OMR',
        ])->assertSessionHasErrors('slot');

        $this->actingAs($admin)->post("/admin/marketplace/ads/{$ad->id}", ['is_paused' => true]);
        $this->assertSame('paused', $ad->fresh()->status);
    }
}
