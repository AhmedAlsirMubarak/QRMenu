<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\SiteSetting;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Notifications\BillingDigest;
use App\Notifications\ExpiredAccountNotice;
use App\Notifications\InvoiceReminder;
use App\Notifications\PlanExpiring;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BillingRemindersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
        config(['qrmenu.timezone' => 'Asia/Muscat']);
        Carbon::setTestNow(Carbon::parse('2026-11-10 09:00', 'Asia/Muscat'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** @return array{0: User, 1: Restaurant} */
    protected function restaurant(): array
    {
        $owner = User::factory()->create();
        $r = app(CreateRestaurant::class)->handle($owner, ['name' => 'Bait', 'main_language' => 'en', 'currency' => 'OMR', 'plan_id' => SubscriptionPlan::where('slug', 'starter')->value('id')]);
        app(CurrentRestaurant::class)->set(null);

        return [$owner, $r];
    }

    public function test_trial_ending_in_three_days_emails_the_owner_once(): void
    {
        Notification::fake();
        [$owner, $r] = $this->restaurant();
        $r->subscription->update(['trial_ends_at' => Carbon::parse('2026-11-13 18:00', 'Asia/Muscat')]);

        $this->artisan('reminders:send')->assertSuccessful();
        $this->artisan('reminders:send')->assertSuccessful(); // second run the same day: nothing new

        Notification::assertSentToTimes($owner, PlanExpiring::class, 1);
        Notification::assertSentTo($owner, PlanExpiring::class, fn ($n) => $n->daysLeft === 3);
    }

    public function test_ended_plan_and_invoice_stages_are_sent(): void
    {
        Notification::fake();
        [$owner, $r] = $this->restaurant();
        $r->subscription->update(['status' => 'expired', 'trial_ends_at' => Carbon::parse('2026-11-09 12:00', 'Asia/Muscat')]);

        $due = Payment::create(['restaurant_id' => $r->id, 'invoice_number' => 'INV-1', 'amount' => 6, 'currency' => 'OMR', 'status' => 'pending', 'due_date' => '2026-11-10']);
        $late = Payment::create(['restaurant_id' => $r->id, 'invoice_number' => 'INV-2', 'amount' => 6, 'currency' => 'OMR', 'status' => 'overdue', 'due_date' => '2026-11-07']);
        Payment::create(['restaurant_id' => $r->id, 'invoice_number' => 'INV-3', 'amount' => 6, 'currency' => 'OMR', 'status' => 'paid', 'due_date' => '2026-11-10']);

        $this->artisan('reminders:send')->assertSuccessful();

        Notification::assertSentTo($owner, PlanExpiring::class, fn ($n) => $n->daysLeft === 0);
        Notification::assertSentTo($owner, InvoiceReminder::class, fn ($n) => $n->payment->is($due) && $n->stage === 'today');
        Notification::assertSentTo($owner, InvoiceReminder::class, fn ($n) => $n->payment->is($late) && $n->stage === 'overdue');
        Notification::assertSentToTimes($owner, InvoiceReminder::class, 2);
    }

    public function test_admin_digest_goes_to_support_email_and_settings_can_turn_reminders_off(): void
    {
        Notification::fake();
        SiteSetting::put('support_email', 'billing@qrmenu.test');
        [$owner, $r] = $this->restaurant();
        $r->subscription->update(['trial_ends_at' => Carbon::parse('2026-11-13 18:00', 'Asia/Muscat')]);
        SiteSetting::put('notify_plan_expiry', false);

        $this->artisan('reminders:send')->assertSuccessful();

        Notification::assertNotSentTo($owner, PlanExpiring::class);
        Notification::assertSentOnDemand(BillingDigest::class, fn ($n, $c, $notifiable) => $notifiable->routes['mail'] === 'billing@qrmenu.test' && count($n->expiring) === 1);
    }

    public function test_expired_dashboard_is_read_only_except_billing_and_export(): void
    {
        [$owner, $r] = $this->restaurant();
        $r->subscription->update(['status' => 'expired', 'expired_at' => now()]);
        $this->withoutVite();

        $this->actingAs($owner)->get('/app/menu')->assertOk();
        $this->actingAs($owner)->post('/app/menu/categories', ['name' => ['en' => 'Lunch']])->assertRedirect();
        $this->assertSame(0, \App\Models\MenuCategory::withoutRestaurantScope()->where('restaurant_id', $r->id)->count());

        $this->actingAs($owner)->get('/app/menu/export')->assertOk();
        $this->actingAs($owner)->post('/app/billing/request', ['plan_id' => SubscriptionPlan::where('slug', 'starter')->value('id'), 'billing_cycle' => 'monthly'])->assertSessionHasNoErrors();
        $this->assertSame(1, \App\Models\UpgradeRequest::withoutRestaurantScope()->count());
    }

    public function test_winback_warnings_then_deletion_keeps_invoices(): void
    {
        Notification::fake();
        [$owner, $r] = $this->restaurant();
        $sub = $r->subscription;
        $invoice = Payment::create(['restaurant_id' => $r->id, 'invoice_number' => 'INV-9', 'amount' => 3, 'currency' => 'OMR', 'status' => 'paid']);

        $sub->update(['status' => 'expired', 'expired_at' => now()->subDays(14)]);
        $this->artisan('reminders:send');
        Notification::assertSentTo($owner, ExpiredAccountNotice::class, fn ($n) => $n->stage === 'winback');

        $sub->update(['expired_at' => now()->subDays(85)]);
        $this->artisan('reminders:send');
        Notification::assertSentTo($owner, ExpiredAccountNotice::class, fn ($n) => $n->stage === 'warning');
        $this->assertNotNull(Restaurant::find($r->id));

        // 90 days offline and the final warning went out more than 5 days ago: deleted.
        // Travel instead of moving expired_at: reminders are keyed by the offline date.
        $this->travel(6)->days();
        $this->artisan('reminders:send');

        $this->assertNull(Restaurant::withTrashed()->find($r->id));
        $this->assertSame('Bait', $invoice->fresh()->payer_name);
        $this->assertNotNull($owner->fresh());
    }

    public function test_no_deletion_when_auto_delete_is_off(): void
    {
        Notification::fake();
        SiteSetting::put('auto_delete_expired', false);
        [, $r] = $this->restaurant();
        $r->subscription->update(['status' => 'expired', 'expired_at' => now()->subDays(200)]);

        $this->artisan('reminders:send');

        $this->assertNotNull(Restaurant::find($r->id));
    }
}
