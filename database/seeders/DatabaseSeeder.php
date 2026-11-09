<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PlanSeeder::class);

        // Super admin — change this password after first login (Settings › Password).
        User::updateOrCreate(
            ['email' => env('SUPER_ADMIN_EMAIL', 'admin@qrmenu.test')],
            [
                'name' => 'Super Admin',
                'password' => env('SUPER_ADMIN_PASSWORD', 'password'),
                'email_verified_at' => now(),
            ],
        )->forceFill(['is_super_admin' => true])->save();

        if (! app()->isProduction()) {
            $this->call(DemoRestaurantSeeder::class);
            $this->call(BlogSeeder::class);
            $this->call(MarketplaceSeeder::class);
        }
    }
}
