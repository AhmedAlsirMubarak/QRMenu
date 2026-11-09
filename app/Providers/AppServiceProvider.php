<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // One tenant context per request.
        $this->app->scoped(CurrentRestaurant::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRestaurantAbilities();

        Route::model('plan', SubscriptionPlan::class);
        Route::model('category', \App\Models\MenuCategory::class);
        Route::model('item', \App\Models\MenuItem::class);
        Route::model('batch', \App\Models\ImportBatch::class);
        Route::model('qr', \App\Models\QrCode::class);
        Route::model('feedback', \App\Models\CustomerFeedback::class);
        Route::model('story', \App\Models\PlateStory::class);
        Route::model('post', \App\Models\BlogPost::class);

        // Guest menu analytics beacons.
        RateLimiter::for('menu-events', fn (Request $request) => Limit::perMinute(120)->by($request->ip()));
    }

    /**
     * Restaurant-level abilities, checked against the user's role in the current restaurant.
     * Usage: Gate::authorize('manage-menu') or $user->can('view-analytics').
     */
    protected function configureRestaurantAbilities(): void
    {
        $abilities = ['manage-restaurant', 'manage-menu', 'manage-staff', 'manage-branches', 'manage-billing',
            'view-feedback', 'view-analytics', 'manage-qr', 'manage-plate-story'];

        foreach ($abilities as $ability) {
            Gate::define($ability, function (User $user) use ($ability) {
                $restaurant = app(CurrentRestaurant::class)->get();

                return $restaurant && ($user->roleIn($restaurant)?->can($ability) ?? false);
            });
        }
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
