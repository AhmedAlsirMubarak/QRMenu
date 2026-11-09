<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_super_admin' => true])->save();

        return $user;
    }

    public function test_super_admin_can_create_update_and_delete_a_plan(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.plans.store'), [
            'name' => ['en' => 'Enterprise', 'ar' => 'المؤسسات'],
            'price_monthly' => 25.5, 'price_yearly' => 250, 'currency' => 'OMR', 'trial_days' => 14,
            'features' => ['analytics', 'plate_story'], 'is_active' => true, 'is_public' => true, 'sort_order' => 4,
        ])->assertRedirect();

        $plan = SubscriptionPlan::where('slug', 'enterprise')->firstOrFail();
        $this->assertSame('25.500', $plan->price_monthly);

        $this->actingAs($admin)->put(route('admin.plans.update', $plan), [
            'name' => ['en' => 'Enterprise+'], 'slug' => 'enterprise', 'price_monthly' => 30, 'currency' => 'OMR',
            'trial_days' => 7, 'features' => [],
        ])->assertRedirect();
        $this->assertSame('Enterprise+', $plan->fresh()->name['en']);

        $this->actingAs($admin)->delete(route('admin.plans.destroy', $plan))->assertRedirect();
        $this->assertSoftDeleted($plan);
    }

    public function test_plan_with_active_subscriptions_cannot_be_deleted(): void
    {
        $this->seed(PlanSeeder::class);
        $plan = SubscriptionPlan::where('slug', 'starter')->first();
        app(CreateRestaurant::class)->handle(User::factory()->create(), [
            'name' => 'Busy', 'main_language' => 'en', 'currency' => 'OMR', 'plan_id' => $plan->id,
        ]);

        $this->actingAs($this->admin())->delete(route('admin.plans.destroy', $plan));

        $this->assertNotSoftDeleted($plan);
    }

    public function test_invalid_plan_is_rejected(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.plans.store'), ['name' => ['en' => ''], 'price_monthly' => -1, 'currency' => 'XXX', 'trial_days' => 14])
            ->assertSessionHasErrors(['name.en', 'price_monthly', 'currency']);
    }
}
