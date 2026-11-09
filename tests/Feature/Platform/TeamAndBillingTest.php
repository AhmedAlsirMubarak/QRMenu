<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\SiteSetting;
use App\Models\SubscriptionPlan;
use App\Models\UpgradeRequest;
use App\Models\User;
use App\Notifications\StaffInvitation;
use App\Notifications\UpgradeRequested;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamAndBillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
    }

    /** @return array{0: User, 1: Restaurant} */
    protected function owner(string $plan = 'business', string $name = 'Bait Al Saffron'): array
    {
        $owner = User::factory()->create();
        $restaurant = app(CreateRestaurant::class)->handle($owner, [
            'name' => $name, 'main_language' => 'en', 'currency' => 'OMR',
            'plan_id' => SubscriptionPlan::where('slug', $plan)->value('id'),
        ]);
        app(CurrentRestaurant::class)->set(null);

        return [$owner->fresh(), $restaurant];
    }

    public function test_pricing_choice_is_preselected_in_onboarding(): void
    {
        $plan = SubscriptionPlan::where('slug', 'business')->first();

        $this->get("/register?plan={$plan->id}")->assertSessionHas('onboarding.plan', $plan->id);

        $this->actingAs(User::factory()->create())->get('/onboarding')
            ->assertInertia(fn (Assert $page) => $page->component('onboarding/create')->where('chosenPlanId', $plan->id));
    }

    public function test_owner_invites_new_and_existing_people(): void
    {
        Notification::fake();
        [$owner, $restaurant] = $this->owner();
        $existing = User::factory()->create(['email' => 'chef@example.com']);

        $this->actingAs($owner)->post('/app/staff', ['name' => 'Sara', 'email' => 'Sara@Example.com', 'role' => 'manager'])->assertSessionHasNoErrors();
        $this->actingAs($owner)->post('/app/staff', ['name' => 'Chef', 'email' => 'chef@example.com', 'role' => 'editor'])->assertSessionHasNoErrors();

        $sara = User::where('email', 'sara@example.com')->first();
        $this->assertSame('manager', $sara->roleIn($restaurant)->value);
        $this->assertSame('editor', $existing->roleIn($restaurant)->value);
        Notification::assertSentTo($sara, StaffInvitation::class, fn ($n) => $n->passwordToken !== null);
        Notification::assertSentTo($existing, StaffInvitation::class, fn ($n) => $n->passwordToken === null);

        // Already on the team.
        $this->actingAs($owner)->post('/app/staff', ['name' => 'Sara', 'email' => 'sara@example.com', 'role' => 'editor'])->assertSessionHasErrors('email');
    }

    public function test_team_size_is_limited_without_staff_roles(): void
    {
        Notification::fake();
        [$owner, $restaurant] = $this->owner('professional');

        $this->actingAs($owner)->post('/app/staff', ['name' => 'A', 'email' => 'a@example.com', 'role' => 'manager']);
        $this->actingAs($owner)->post('/app/staff', ['name' => 'B', 'email' => 'b@example.com', 'role' => 'manager']);

        $this->assertSame(2, $restaurant->users()->count());
    }

    public function test_the_last_owner_cannot_be_demoted_or_removed_and_staff_cannot_manage_team(): void
    {
        Notification::fake();
        [$owner, $restaurant] = $this->owner();
        $this->actingAs($owner)->post('/app/staff', ['name' => 'M', 'email' => 'm@example.com', 'role' => 'manager']);
        $manager = User::where('email', 'm@example.com')->first();

        $this->actingAs($manager)->get('/app/staff')->assertForbidden();
        $this->actingAs($manager)->delete("/app/staff/{$owner->id}")->assertForbidden();

        $this->actingAs($owner)->put("/app/staff/{$owner->id}", ['role' => 'editor']);
        $this->assertSame('owner', $owner->roleIn($restaurant)->value);

        $this->actingAs($owner)->delete("/app/staff/{$manager->id}");
        $this->assertNull($manager->roleIn($restaurant));
    }

    public function test_staff_routes_cannot_touch_other_restaurants_members(): void
    {
        [$owner] = $this->owner();
        [$otherOwner] = $this->owner('business', 'Other Café');

        $this->actingAs($owner)->put("/app/staff/{$otherOwner->id}", ['role' => 'editor'])->assertNotFound();
        $this->actingAs($owner)->delete("/app/staff/{$otherOwner->id}")->assertNotFound();
    }

    public function test_billing_shows_own_invoices_only_and_sends_upgrade_requests(): void
    {
        Notification::fake();
        SiteSetting::put('support_email', 'billing@qrmenu.test');
        [$owner, $restaurant] = $this->owner('starter');
        [, $other] = $this->owner('starter', 'Other Café');

        $mine = Payment::create(['restaurant_id' => $restaurant->id, 'invoice_number' => 'INV-1', 'amount' => 3, 'currency' => 'OMR', 'status' => 'paid', 'paid_at' => now()]);
        $theirs = Payment::create(['restaurant_id' => $other->id, 'invoice_number' => 'INV-2', 'amount' => 3, 'currency' => 'OMR', 'status' => 'paid']);

        $this->actingAs($owner)->get('/app/billing')->assertInertia(fn (Assert $page) => $page
            ->component('restaurant/billing')
            ->has('payments', 1)
            ->where('payments.0.invoice_number', 'INV-1'));

        $this->actingAs($owner)->get("/app/billing/invoices/{$mine->id}")->assertOk();
        $this->actingAs($owner)->get("/app/billing/invoices/{$theirs->id}")->assertNotFound();

        $business = SubscriptionPlan::where('slug', 'business')->value('id');
        $this->actingAs($owner)->post('/app/billing/request', ['plan_id' => $business, 'billing_cycle' => 'yearly'])->assertSessionHasNoErrors();
        $this->actingAs($owner)->post('/app/billing/request', ['plan_id' => $business, 'billing_cycle' => 'yearly']);

        $this->assertSame(1, UpgradeRequest::withoutRestaurantScope()->count());
        Notification::assertSentOnDemand(UpgradeRequested::class);
    }
}
