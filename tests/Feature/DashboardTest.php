<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_new_users_are_sent_to_onboarding()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertRedirect(route('onboarding.create'));
    }

    public function test_super_admins_are_sent_to_the_admin_panel()
    {
        $user = User::factory()->create();
        $user->forceFill(['is_super_admin' => true])->save();

        $this->actingAs($user)->get(route('dashboard'))->assertRedirect(route('admin.dashboard'));
    }
}
