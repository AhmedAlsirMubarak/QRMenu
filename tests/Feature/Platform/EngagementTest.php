<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\CustomerFeedback;
use App\Models\MenuCategory;
use App\Models\MenuEvent;
use App\Models\MenuItem;
use App\Models\Payment;
use App\Models\PlateStory;
use App\Models\Restaurant;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Notifications\LowRatingAlert;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EngagementTest extends TestCase
{
    use RefreshDatabase;

    protected const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
        Storage::fake('public');
    }

    /** @return array{0: User, 1: Restaurant, 2: MenuItem} */
    protected function restaurant(string $plan = 'professional', string $name = 'Bait Al Saffron'): array
    {
        $owner = User::factory()->create();
        $restaurant = app(CreateRestaurant::class)->handle($owner, [
            'name' => $name, 'main_language' => 'en', 'languages' => ['ar'], 'currency' => 'OMR',
            'plan_id' => SubscriptionPlan::where('slug', $plan)->value('id'),
        ]);
        $category = MenuCategory::create(['restaurant_id' => $restaurant->id, 'name' => ['en' => 'Breakfast']]);
        $item = MenuItem::create(['restaurant_id' => $restaurant->id, 'menu_category_id' => $category->id, 'name' => ['en' => 'Shakshuka'], 'price' => 2.4]);
        app(CurrentRestaurant::class)->set(null);

        return [$owner, $restaurant, $item];
    }

    protected function setSettings(Restaurant $restaurant, string $key, array $value): void
    {
        $settings = $restaurant->settings ?? [];
        $settings[$key] = $value;
        $restaurant->update(['settings' => $settings]);
    }

    public function test_low_rating_sends_an_email_alert_once_and_high_rating_does_not(): void
    {
        Notification::fake();
        [, $restaurant] = $this->restaurant();
        $this->setSettings($restaurant, 'feedback', ['alert_threshold' => 2, 'alert_email' => 'manager@example.com']);
        $branch = $restaurant->branches()->first();

        $this->post("/{$restaurant->slug}/feedback", ['branch_id' => $branch->id, 'overall_rating' => 5, 'service_rating' => 4]);
        $this->post("/{$restaurant->slug}/feedback", ['branch_id' => $branch->id, 'overall_rating' => 3, 'service_rating' => 1, 'comment' => 'Waited 40 minutes']);

        Notification::assertSentOnDemandTimes(LowRatingAlert::class, 1);
        $this->assertNotNull(CustomerFeedback::withoutRestaurantScope()->where('service_rating', 1)->value('alert_sent_at'));
    }

    public function test_alert_goes_to_owners_when_no_alert_email_is_set(): void
    {
        Notification::fake();
        [$owner, $restaurant] = $this->restaurant();
        $this->setSettings($restaurant, 'feedback', ['alert_threshold' => 2, 'alert_email' => null]);

        $this->post("/{$restaurant->slug}/feedback", ['branch_id' => $restaurant->branches()->first()->id, 'overall_rating' => 1]);

        Notification::assertSentOnDemand(LowRatingAlert::class, fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === [$owner->email]);
    }

    public function test_feedback_dashboard_shows_averages_and_resolve_is_tenant_safe(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        [, $other] = $this->restaurant('professional', 'Other');
        foreach ([5, 4, 1] as $r) {
            CustomerFeedback::create(['restaurant_id' => $restaurant->id, 'branch_id' => $restaurant->branches()->first()->id, 'overall_rating' => $r, 'food_rating' => $r]);
        }
        $theirs = CustomerFeedback::create(['restaurant_id' => $other->id, 'overall_rating' => 1]);

        $this->actingAs($owner)->get('/app/feedback')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('restaurant/feedback/index')
            ->where('summary.total', 3)
            ->where('summary.overall', 3.33)
            ->where('summary.open_low', 1));

        $this->actingAs($owner)->patch("/app/feedback/{$theirs->id}", ['resolved' => true])->assertNotFound();

        $mine = CustomerFeedback::withoutRestaurantScope()->where('restaurant_id', $restaurant->id)->where('overall_rating', 1)->first();
        $this->actingAs($owner)->patch("/app/feedback/{$mine->id}", ['resolved' => true]);
        $this->assertNotNull(CustomerFeedback::withoutRestaurantScope()->find($mine->id)->resolved_at);
    }

    public function test_guest_can_create_a_plate_story_and_get_one_reward(): void
    {
        [$owner, $restaurant, $item] = $this->restaurant();
        $this->setSettings($restaurant, 'plate_story', [
            'enabled' => true, 'card_styles' => ['dark'], 'reward_enabled' => true,
            'reward_text' => ['en' => 'Free karak'], 'reward_days' => 30, 'reward_limit' => 'week',
        ]);
        $payload = fn () => [
            'branch_id' => $restaurant->branches()->first()->id, 'menu_item_id' => $item->id, 'style' => 'dark',
            'before' => UploadedFile::fake()->image('b.jpg'), 'card' => UploadedFile::fake()->image('c.png', 1080, 1920),
        ];

        $first = $this->withHeader('User-Agent', self::PHONE)->postJson("/{$restaurant->slug}/plate-story", $payload())->assertOk();
        $this->assertNotNull($first->json('reward.code'));
        $this->assertSame('Free karak', $first->json('reward.text.en'));

        // Same guest (same phone, so same cookie) again this week → story saved, but no second reward.
        $deviceCookie = 'ps_reward_'.$restaurant->id;
        $first->assertCookie($deviceCookie);
        $second = $this->withHeader('User-Agent', self::PHONE)->withCredentials()->withCookie($deviceCookie, $first->getCookie($deviceCookie)->getValue())
            ->postJson("/{$restaurant->slug}/plate-story", $payload())->assertOk();
        $this->assertNull($second->json('reward'));
        $this->assertSame(2, PlateStory::withoutRestaurantScope()->count());

        // Sharing is recorded.
        $this->withHeader('User-Agent', self::PHONE)->post("/m/{$restaurant->slug}/e", ['event' => 'plate_story_share', 'subject_id' => $first->json('id')]);
        $this->assertNotNull(PlateStory::withoutRestaurantScope()->find($first->json('id'))->shared_at);

        // Staff first check the code (shows the photo, doesn't use it), then confirm.
        $code = $first->json('reward.code');
        $this->actingAs($owner)->post('/app/plate-story/redeem', ['code' => strtolower($code)])->assertInertiaFlash('rewardCheck.code', $code);
        $this->assertNull(PlateStory::withoutRestaurantScope()->where('reward_code', $code)->value('reward_redeemed_at'));
        $this->actingAs($owner)->post('/app/plate-story/redeem', ['code' => $code, 'confirm' => true]);
        $this->assertNotNull(PlateStory::withoutRestaurantScope()->where('reward_code', $code)->value('reward_redeemed_at'));

        // Approving puts the photo on the dish in the guest menu.
        $this->actingAs($owner)->patch('/app/plate-story/'.$first->json('id'), ['status' => 'approved']);
        $this->get('/'.$restaurant->slug)->assertInertia(fn (Assert $page) => $page->has('categories.0.items.0.guest_photos', 1));
    }

    public function test_daily_cap_stops_farming_codes_from_fresh_devices(): void
    {
        [, $restaurant] = $this->restaurant();
        $this->setSettings($restaurant, 'plate_story', [
            'enabled' => true, 'card_styles' => ['dark'], 'reward_enabled' => true,
            'reward_text' => ['en' => 'Free karak'], 'reward_days' => 30, 'reward_limit' => 'week', 'reward_daily_cap' => 2,
        ]);
        $upload = fn () => $this->withHeader('User-Agent', self::PHONE)->postJson("/{$restaurant->slug}/plate-story", [
            'branch_id' => $restaurant->branches()->first()->id, 'style' => 'dark', 'before' => UploadedFile::fake()->image('b.jpg'),
        ])->assertOk();

        // No cookies sent: every upload looks like a new phone (or a cleared browser).
        $this->assertNotNull($upload()->json('reward.code'));
        $this->assertNotNull($upload()->json('reward.code'));
        $this->assertNull($upload()->json('reward'));
        $this->assertSame(3, PlateStory::withoutRestaurantScope()->count());
    }

    public function test_photo_without_dish_needs_one_before_approval(): void
    {
        [$owner, $restaurant, $item] = $this->restaurant();
        [, $other, $otherItem] = $this->restaurant();
        $story = PlateStory::withoutRestaurantScope()->create([
            'restaurant_id' => $restaurant->id, 'branch_id' => $restaurant->branches()->first()->id, 'before_path' => 'x.jpg',
            'card_style' => 'dark', 'status' => 'pending',
        ]);

        $this->actingAs($owner)->patch("/app/plate-story/{$story->id}", ['status' => 'approved'])->assertSessionHasErrors('menu_item_id');
        $this->actingAs($owner)->patch("/app/plate-story/{$story->id}", ['status' => 'approved', 'menu_item_id' => $otherItem->id])->assertSessionHasErrors('menu_item_id');
        $this->assertSame('pending', $story->fresh()->status);

        $this->actingAs($owner)->patch("/app/plate-story/{$story->id}", ['status' => 'approved', 'menu_item_id' => $item->id])->assertSessionHasNoErrors();
        $this->assertSame('approved', $story->fresh()->status);
        $this->assertSame($item->id, $story->fresh()->menu_item_id);
    }

    public function test_hidden_photo_codes_cannot_be_redeemed(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        $story = PlateStory::withoutRestaurantScope()->create([
            'restaurant_id' => $restaurant->id, 'branch_id' => $restaurant->branches()->first()->id, 'before_path' => 'x.jpg',
            'card_style' => 'dark', 'status' => 'hidden', 'reward_code' => 'ABC-123', 'reward_expires_at' => now()->addWeek(),
        ]);

        $this->actingAs($owner)->post('/app/plate-story/redeem', ['code' => 'ABC-123', 'confirm' => true])->assertInertiaFlashMissing('rewardCheck');
        $this->assertNull($story->fresh()->reward_redeemed_at);
    }

    public function test_plate_story_rejects_dishes_from_another_restaurant_and_respects_disabled(): void
    {
        [, $restaurant] = $this->restaurant();
        [, , $otherItem] = $this->restaurant('professional', 'Other');

        $this->postJson("/{$restaurant->slug}/plate-story", [
            'branch_id' => $restaurant->branches()->first()->id, 'menu_item_id' => $otherItem->id, 'style' => 'dark',
            'before' => UploadedFile::fake()->image('b.jpg'), 'card' => UploadedFile::fake()->image('c.png'),
        ])->assertJsonValidationErrors('menu_item_id');

        $this->setSettings($restaurant, 'plate_story', ['enabled' => false]);
        $this->postJson("/{$restaurant->slug}/plate-story", [])->assertNotFound();
    }

    public function test_analytics_counts_scans_views_and_top_dishes(): void
    {
        [$owner, $restaurant, $item] = $this->restaurant();
        foreach ([['scan', null], ['menu_view', null], ['menu_view', null], ['item_view', $item->id]] as [$event, $subject]) {
            MenuEvent::create(['restaurant_id' => $restaurant->id, 'event' => $event, 'subject_type' => $subject ? 'item' : null, 'subject_id' => $subject, 'session_hash' => 'abc', 'locale' => 'ar', 'source' => 'qr']);
        }

        $this->actingAs($owner)->get('/app/analytics?period=7')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('restaurant/analytics/index')
            ->where('kpis.scans', 1)
            ->where('kpis.views', 2)
            ->where('kpis.visitors', 1)
            ->where('topItems.0.name', 'Shakshuka')
            ->where('languages.1.views', 2));
    }

    public function test_super_admin_records_payment_which_activates_subscription(): void
    {
        [, $restaurant] = $this->restaurant('starter');
        $admin = User::factory()->create();
        $admin->forceFill(['is_super_admin' => true])->save();
        $pro = SubscriptionPlan::where('slug', 'professional')->first();

        $this->actingAs($admin)->post('/admin/finance/payments', [
            'restaurant_id' => $restaurant->id, 'type' => 'subscription', 'amount' => '6.000', 'currency' => 'OMR',
            'method' => 'bank_transfer', 'status' => 'paid', 'extend' => true, 'plan_id' => $pro->id, 'billing_cycle' => 'monthly',
        ])->assertSessionHasNoErrors();

        $payment = Payment::firstOrFail();
        $this->assertSame('paid', $payment->status);
        $this->assertNotNull($payment->paid_at);
        $subscription = Subscription::withoutRestaurantScope()->where('restaurant_id', $restaurant->id)->latest('id')->first();
        $this->assertSame('active', $subscription->status);
        $this->assertSame($pro->id, $subscription->subscription_plan_id);
        $this->assertTrue($subscription->ends_at->isAfter(now()->addDays(27)));

        $this->actingAs($admin)->get('/admin/finance')->assertOk()->assertInertia(fn (Assert $page) => $page->where('kpis.revenue_month', 6)->where('kpis.active_subscriptions', 1));
        $this->actingAs($admin)->get("/admin/finance/payments/{$payment->id}/invoice")->assertOk();
        $this->actingAs($admin)->get('/admin/finance/export?format=csv')->assertDownload();
    }

    public function test_external_advertiser_invoice_and_restaurant_staff_cannot_see_finance(): void
    {
        [$owner] = $this->restaurant();
        $admin = User::factory()->create();
        $admin->forceFill(['is_super_admin' => true])->save();

        $this->actingAs($admin)->post('/admin/finance/payments', [
            'payer_name' => 'Coffee Brand LLC', 'type' => 'advertising', 'amount' => 40, 'currency' => 'OMR',
            'status' => 'pending', 'due_date' => now()->subDays(3)->toDateString(),
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->get('/admin/finance')->assertInertia(fn (Assert $page) => $page->where('kpis.overdue_count', 1));
        $this->actingAs($owner)->get('/admin/finance')->assertForbidden();
    }
}
