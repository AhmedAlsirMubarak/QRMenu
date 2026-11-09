<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\AdCampaign;
use App\Models\Branch;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RestaurantDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
    }

    public function test_delete_needs_the_name_then_can_be_restored_or_erased(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_super_admin' => true])->save();
        $owner = User::factory()->create();
        $r = app(CreateRestaurant::class)->handle($owner, ['name' => 'Gone Café', 'main_language' => 'en', 'currency' => 'OMR']);
        app(CurrentRestaurant::class)->set(null);
        $ad = AdCampaign::create(['advertiser_type' => 'restaurant', 'restaurant_id' => $r->id, 'slot' => 'sidebar', 'title' => ['en' => 'x'], 'starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        $invoice = Payment::create(['restaurant_id' => $r->id, 'invoice_number' => 'INV-9', 'amount' => 3, 'currency' => 'OMR', 'status' => 'paid']);

        // Wrong name: nothing happens.
        $this->actingAs($admin)->delete("/admin/restaurants/{$r->id}", ['confirm_name' => 'gone'])->assertSessionHasErrors('confirm_name');
        $this->assertFalse($r->fresh()->trashed());

        // Soft delete: menu offline, owner loses access, ads paused.
        $this->actingAs($admin)->delete("/admin/restaurants/{$r->id}", ['confirm_name' => 'Gone Café'])->assertSessionHasNoErrors();
        $this->assertTrue(Restaurant::withTrashed()->find($r->id)->trashed());
        $this->assertTrue($ad->fresh()->is_paused);
        $this->get("/{$r->slug}")->assertNotFound();
        $this->actingAs($owner)->get('/app')->assertRedirect('/onboarding');

        // Restore.
        $this->actingAs($admin)->patch("/admin/restaurants/{$r->id}/restore");
        $this->assertFalse($r->fresh()->trashed());

        // Permanent delete only works on deleted restaurants.
        $this->actingAs($admin)->delete("/admin/restaurants/{$r->id}/force", ['confirm_name' => 'Gone Café'])->assertNotFound();
        $this->actingAs($admin)->delete("/admin/restaurants/{$r->id}", ['confirm_name' => 'Gone Café']);
        $this->actingAs($admin)->delete("/admin/restaurants/{$r->id}/force", ['confirm_name' => 'Gone Café']);

        $this->assertNull(Restaurant::withTrashed()->find($r->id));
        $this->assertSame(0, Branch::withoutRestaurantScope()->where('restaurant_id', $r->id)->count());
        $this->assertNull(AdCampaign::withTrashed()->find($ad->id));
        $this->assertNotNull($invoice->fresh()); // finance history is kept
        $this->assertNotNull($owner->fresh());   // user accounts are kept
    }
}
