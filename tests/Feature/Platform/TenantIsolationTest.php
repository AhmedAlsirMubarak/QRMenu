<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\MenuCategory;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_queries_only_return_the_current_restaurants_data(): void
    {
        $this->seed(PlanSeeder::class);
        $create = app(CreateRestaurant::class);
        $a = $create->handle(User::factory()->create(), ['name' => 'Alpha', 'main_language' => 'en', 'currency' => 'OMR']);
        $b = $create->handle(User::factory()->create(), ['name' => 'Beta', 'main_language' => 'ar', 'currency' => 'AED']);

        $current = app(CurrentRestaurant::class);

        $current->set($a);
        MenuCategory::create(['name' => ['en' => 'Alpha burgers']]);

        $current->set($b);
        MenuCategory::create(['name' => ['en' => 'Beta salads']]);

        $this->assertSame(['Beta salads'], MenuCategory::pluck('name')->pluck('en')->all());

        $current->set($a);
        $this->assertSame(['Alpha burgers'], MenuCategory::pluck('name')->pluck('en')->all());
        $this->assertSame(2, MenuCategory::withoutRestaurantScope()->count());
    }

    public function test_new_restaurant_gets_owner_branch_qr_and_trial(): void
    {
        $this->seed(PlanSeeder::class);
        $owner = User::factory()->create();

        $restaurant = app(CreateRestaurant::class)->handle($owner, [
            'name' => 'Café Muscat', 'main_language' => 'ar', 'languages' => ['en'], 'currency' => 'OMR',
        ]);

        $this->assertSame('cafe-muscat', $restaurant->slug);
        $this->assertSame(['ar', 'en'], $restaurant->languages);
        $this->assertSame('owner', $owner->roleIn($restaurant)?->value);
        $this->assertSame(1, $restaurant->branches()->count());
        $this->assertSame('trialing', $restaurant->subscription->status);
    }

    public function test_user_cannot_switch_to_a_restaurant_they_do_not_belong_to(): void
    {
        $this->seed(PlanSeeder::class);
        $create = app(CreateRestaurant::class);
        $mine = User::factory()->create();
        $create->handle($mine, ['name' => 'Mine', 'main_language' => 'en', 'currency' => 'OMR']);
        $other = $create->handle(User::factory()->create(), ['name' => 'Other', 'main_language' => 'en', 'currency' => 'OMR']);

        $this->actingAs($mine)->post(route('restaurant.switch'), ['restaurant_id' => $other->id])->assertForbidden();
    }

    public function test_restaurant_staff_cannot_open_super_admin(): void
    {
        $this->seed(PlanSeeder::class);
        $user = User::factory()->create();
        app(CreateRestaurant::class)->handle($user, ['name' => 'Mine', 'main_language' => 'en', 'currency' => 'OMR']);

        $this->actingAs($user)->get(route('admin.plans.index'))->assertForbidden();
        $this->actingAs($user)->get(route('restaurant.dashboard'))->assertOk();
    }
}
