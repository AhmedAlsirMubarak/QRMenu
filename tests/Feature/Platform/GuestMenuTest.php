<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\CustomerFeedback;
use App\Models\MenuCategory;
use App\Models\MenuEvent;
use App\Models\MenuItem;
use App\Models\QrCode;
use App\Models\Restaurant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GuestMenuTest extends TestCase
{
    use RefreshDatabase;

    protected const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
    }

    /** @return array{0: User, 1: Restaurant} */
    protected function restaurant(string $plan = 'professional', string $name = 'Bait Al Saffron'): array
    {
        $owner = User::factory()->create();
        $restaurant = app(CreateRestaurant::class)->handle($owner, [
            'name' => $name, 'main_language' => 'en', 'languages' => ['ar'], 'currency' => 'OMR',
            'plan_id' => SubscriptionPlan::where('slug', $plan)->value('id'),
        ]);
        $category = MenuCategory::create(['restaurant_id' => $restaurant->id, 'name' => ['en' => 'Breakfast', 'ar' => 'فطور']]);
        MenuItem::create(['restaurant_id' => $restaurant->id, 'menu_category_id' => $category->id, 'name' => ['en' => 'Shakshuka', 'ar' => 'شكشوكة'], 'price' => 2.4]);
        $hidden = MenuCategory::create(['restaurant_id' => $restaurant->id, 'name' => ['en' => 'Secret'], 'is_active' => false]);
        MenuItem::create(['restaurant_id' => $restaurant->id, 'menu_category_id' => $hidden->id, 'name' => ['en' => 'Hidden dish'], 'price' => 1]);
        app(CurrentRestaurant::class)->set(null);

        return [$owner, $restaurant];
    }

    public function test_guest_sees_the_live_menu_without_logging_in(): void
    {
        [, $restaurant] = $this->restaurant();

        $this->withHeader('User-Agent', self::PHONE)->get('/'.$restaurant->slug)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/menu')
                ->where('restaurant.name', 'Bait Al Saffron')
                ->where('restaurant.currency.code', 'OMR')
                ->has('categories', 1)
                ->where('categories.0.items.0.name.ar', 'شكشوكة'));

        $this->assertSame(1, MenuEvent::withoutRestaurantScope()->where('event', 'menu_view')->count());
    }

    public function test_qr_code_redirects_counts_the_scan_and_remembers_the_table(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        app(CurrentRestaurant::class)->set($restaurant);
        $table = QrCode::create(['branch_id' => $restaurant->branches()->first()->id, 'table_label' => 'Table 07']);
        app(CurrentRestaurant::class)->set(null);

        $this->withHeader('User-Agent', self::PHONE)->get('/q/'.$table->code)
            ->assertRedirect(route('menu.show', ['restaurant' => $restaurant->slug, 'branch' => 'main']));

        $this->withHeader('User-Agent', self::PHONE)->get('/'.$restaurant->slug.'?branch=main')
            ->assertInertia(fn (Assert $page) => $page->where('table', 'Table 07'));

        $this->assertSame(1, $table->fresh()->scans_count);
        $this->assertSame(1, MenuEvent::withoutRestaurantScope()->where('event', 'scan')->count());
        $this->assertSame('qr', MenuEvent::withoutRestaurantScope()->where('event', 'menu_view')->value('source'));
    }

    public function test_bots_and_link_previews_are_not_counted(): void
    {
        [, $restaurant] = $this->restaurant();
        $qr = QrCode::withoutRestaurantScope()->where('restaurant_id', $restaurant->id)->first();

        $this->withHeader('User-Agent', 'WhatsApp/2.23.20 A')->get('/q/'.$qr->code)->assertRedirect();
        $this->withHeader('User-Agent', 'Googlebot/2.1')->get('/'.$restaurant->slug)->assertOk();

        $this->assertSame(0, $qr->fresh()->scans_count);
        $this->assertSame(0, MenuEvent::withoutRestaurantScope()->count());
    }

    public function test_guest_can_leave_feedback_for_the_branch(): void
    {
        [, $restaurant] = $this->restaurant();
        $branch = $restaurant->branches()->first();

        $this->withHeader('User-Agent', self::PHONE)->from('/'.$restaurant->slug)->post('/'.$restaurant->slug.'/feedback', [
            'branch_id' => $branch->id, 'overall_rating' => 4, 'food_rating' => 5, 'comment' => 'Great karak', 'is_anonymous' => true,
        ])->assertRedirect('/'.$restaurant->slug);

        $feedback = CustomerFeedback::withoutRestaurantScope()->firstOrFail();
        $this->assertSame($restaurant->id, $feedback->restaurant_id);
        $this->assertSame(4, $feedback->overall_rating);
    }

    public function test_feedback_cannot_target_another_restaurants_branch_and_honeypot_blocks_bots(): void
    {
        [, $mine] = $this->restaurant();
        [, $other] = $this->restaurant('professional', 'Other Place');

        $this->post('/'.$mine->slug.'/feedback', ['branch_id' => $other->branches()->first()->id, 'overall_rating' => 1])->assertSessionHasErrors('branch_id');
        $this->post('/'.$mine->slug.'/feedback', ['branch_id' => $mine->branches()->first()->id, 'overall_rating' => 5, 'website' => 'spam'])->assertSessionHasErrors('website');
        $this->assertSame(0, CustomerFeedback::withoutRestaurantScope()->count());
    }

    public function test_analytics_beacon_records_item_views_without_csrf(): void
    {
        [, $restaurant] = $this->restaurant();
        $item = MenuItem::withoutRestaurantScope()->first();

        $this->withHeader('User-Agent', self::PHONE)->post("/m/{$restaurant->slug}/e", ['event' => 'item_view', 'subject_id' => $item->id, 'locale' => 'ar'])->assertNoContent();

        $event = MenuEvent::withoutRestaurantScope()->where('event', 'item_view')->firstOrFail();
        $this->assertSame('item', $event->subject_type);
        $this->assertSame('ar', $event->locale);
    }

    public function test_suspended_restaurant_shows_unavailable_page_and_unknown_slug_404s(): void
    {
        [, $restaurant] = $this->restaurant();
        $restaurant->update(['status' => 'suspended']);

        $this->get('/'.$restaurant->slug)->assertInertia(fn (Assert $page) => $page->component('public/unavailable'));
        $this->get('/no-such-restaurant')->assertNotFound();
    }

    public function test_reserved_paths_are_not_treated_as_restaurants(): void
    {
        $this->get('/login')->assertOk();
        $this->get('/admin')->assertRedirect(route('login'));
    }

    public function test_owner_manages_table_qr_codes_and_cannot_touch_others(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        [, $other] = $this->restaurant('professional', 'Other Place');
        $branch = $restaurant->branches()->first();

        $this->actingAs($owner)->post('/app/qr', ['branch_id' => $branch->id, 'prefix' => 'Table', 'from' => 1, 'to' => 5])->assertSessionHasNoErrors();
        $this->assertSame(5, QrCode::withoutRestaurantScope()->where('branch_id', $branch->id)->whereNotNull('table_label')->count());

        // Same range again → nothing duplicated.
        $this->actingAs($owner)->post('/app/qr', ['branch_id' => $branch->id, 'from' => 1, 'to' => 5]);
        $this->assertSame(5, QrCode::withoutRestaurantScope()->where('branch_id', $branch->id)->whereNotNull('table_label')->count());

        $theirQr = QrCode::withoutRestaurantScope()->where('restaurant_id', $other->id)->first();
        $this->actingAs($owner)->delete("/app/qr/{$theirQr->id}")->assertNotFound();
        $this->actingAs($owner)->post('/app/qr', ['branch_id' => $other->branches()->withoutRestaurantScope()->first()->id, 'from' => 1, 'to' => 2])->assertNotFound();

        // The branch's main QR code can't be deleted.
        $mainQr = QrCode::withoutRestaurantScope()->where('branch_id', $branch->id)->whereNull('table_label')->first();
        $this->actingAs($owner)->delete("/app/qr/{$mainQr->id}");
        $this->assertNotNull(QrCode::withoutRestaurantScope()->find($mainQr->id));

        $this->actingAs($owner)->get('/app/qr')->assertOk();
        $this->actingAs($owner)->get('/app/qr/print')->assertOk();
    }

    public function test_starter_plan_cannot_create_table_codes(): void
    {
        [$owner, $restaurant] = $this->restaurant('starter');

        $this->actingAs($owner)->post('/app/qr', ['branch_id' => $restaurant->branches()->first()->id, 'from' => 1, 'to' => 3]);
        $this->assertSame(0, QrCode::withoutRestaurantScope()->whereNotNull('table_label')->count());
    }
}
