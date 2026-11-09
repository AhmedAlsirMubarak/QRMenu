<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\MenuEvent;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminUsersAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_super_admin' => true])->save();

        return $admin;
    }

    public function test_only_super_admins_see_users_and_analytics(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get('/admin/users')->assertForbidden();
        $this->actingAs($user)->get('/admin/analytics')->assertForbidden();
    }

    public function test_users_list_search_and_reset_link(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $sara = User::factory()->create(['name' => 'Sara Al Balushi', 'email' => 'sara@example.com']);
        User::factory()->create(['name' => 'Someone Else']);

        $this->actingAs($admin)->get('/admin/users?search=balushi')->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')->has('users.data', 1)->where('users.data.0.email', 'sara@example.com'));

        $this->actingAs($admin)->post("/admin/users/{$sara->id}/reset");
        Notification::assertSentTo($sara, ResetPassword::class);
    }

    public function test_admin_cannot_remove_own_access_or_delete_sole_owner(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->patch("/admin/users/{$admin->id}", ['is_super_admin' => false]);
        $this->assertTrue($admin->fresh()->isSuperAdmin());

        $owner = User::factory()->create();
        app(CreateRestaurant::class)->handle($owner, ['name' => 'Solo Café', 'main_language' => 'en', 'currency' => 'OMR']);
        app(CurrentRestaurant::class)->set(null);

        $this->actingAs($admin)->delete("/admin/users/{$owner->id}");
        $this->assertNotNull($owner->fresh());

        $loner = User::factory()->create();
        $this->actingAs($admin)->delete("/admin/users/{$loner->id}");
        $this->assertNull($loner->fresh());
    }

    public function test_global_analytics_counts_all_restaurants(): void
    {
        foreach (['One', 'Two'] as $name) {
            $r = app(CreateRestaurant::class)->handle(User::factory()->create(), ['name' => $name, 'main_language' => 'en', 'currency' => 'OMR']);
            app(CurrentRestaurant::class)->set(null);
            MenuEvent::withoutRestaurantScope()->insert([
                ['restaurant_id' => $r->id, 'event' => 'scan', 'session_hash' => 'a', 'created_at' => now()],
                ['restaurant_id' => $r->id, 'event' => 'menu_view', 'session_hash' => 'a', 'created_at' => now()],
            ]);
        }

        $this->actingAs($this->admin())->get('/admin/analytics?period=7')->assertInertia(fn (Assert $page) => $page
            ->component('admin/analytics/index')
            ->where('kpis.scans', 2)
            ->where('kpis.active_restaurants', 2)
            ->has('daily', 7)
            ->has('topRestaurants', 2));
    }
}
