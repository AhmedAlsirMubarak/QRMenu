<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\DashboardRedirectController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\Public\MenuController as PublicMenuController;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use App\Http\Controllers\Restaurant;
use Illuminate\Support\Facades\Route;

// Public website
Route::get('/', [\App\Http\Controllers\Website\WebsiteController::class, 'home'])->name('home');
Route::get('marketplace', [\App\Http\Controllers\Website\MarketplaceController::class, 'index'])->name('marketplace');
Route::get('ads/{ad}/click', [\App\Http\Controllers\Website\MarketplaceController::class, 'click'])->name('ads.click')->middleware('throttle:60,1');
Route::get('clients', [\App\Http\Controllers\Website\WebsiteController::class, 'clientsPage'])->name('website.clients');
Route::get('contact', [\App\Http\Controllers\Website\ContactController::class, 'show'])->name('website.contact');
Route::post('contact', [\App\Http\Controllers\Website\ContactController::class, 'store'])->name('website.contact.store')->middleware('throttle:5,10');
Route::get('terms', [\App\Http\Controllers\Website\WebsiteController::class, 'terms'])->name('website.terms');
Route::get('blog', [\App\Http\Controllers\Website\WebsiteController::class, 'blog'])->name('website.blog');
Route::get('blog/{slug}', [\App\Http\Controllers\Website\WebsiteController::class, 'post'])->name('website.post')->where('slug', '[a-z0-9-]+');

Route::middleware(['auth', 'verified'])->group(function () {
    // Sends super admins, restaurant staff and brand-new users to the right place.
    Route::get('dashboard', DashboardRedirectController::class)->name('dashboard');

    Route::get('onboarding', [OnboardingController::class, 'create'])->name('onboarding.create');
    Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');

    // Restaurant dashboard (tenant scoped)
    Route::middleware(['restaurant', \App\Http\Middleware\ReadOnlyWhenExpired::class])->prefix('app')->name('restaurant.')->group(function () {
        Route::get('/', [Restaurant\DashboardController::class, 'index'])->name('dashboard');
        Route::post('switch', [Restaurant\DashboardController::class, 'switch'])->name('switch');

        Route::get('profile', [Restaurant\ProfileController::class, 'edit'])->name('profile.edit');
        Route::post('profile', [Restaurant\ProfileController::class, 'update'])->name('profile.update');
        Route::put('profile/marketplace', [Restaurant\ProfileController::class, 'updateMarketplace'])->name('profile.marketplace');
        Route::put('menu/settings', [Restaurant\ProfileController::class, 'updateMenuSettings'])->name('menu.settings');

        Route::get('branches', [Restaurant\BranchController::class, 'index'])->name('branches.index');
        Route::post('branches', [Restaurant\BranchController::class, 'store'])->name('branches.store');
        Route::put('branches/{branch}', [Restaurant\BranchController::class, 'update'])->name('branches.update');
        Route::delete('branches/{branch}', [Restaurant\BranchController::class, 'destroy'])->name('branches.destroy');

        Route::get('menu', [Restaurant\MenuController::class, 'index'])->name('menu.index');
        Route::post('menu/categories', [Restaurant\CategoryController::class, 'store'])->name('categories.store');
        Route::post('menu/categories/reorder', [Restaurant\CategoryController::class, 'reorder'])->name('categories.reorder');
        Route::put('menu/categories/{category}', [Restaurant\CategoryController::class, 'update'])->name('categories.update');
        Route::delete('menu/categories/{category}', [Restaurant\CategoryController::class, 'destroy'])->name('categories.destroy');

        Route::post('menu/items', [Restaurant\ItemController::class, 'store'])->name('items.store');
        Route::post('menu/items/reorder', [Restaurant\ItemController::class, 'reorder'])->name('items.reorder');
        Route::put('menu/items/{item}', [Restaurant\ItemController::class, 'update'])->name('items.update');
        Route::patch('menu/items/{item}/toggle', [Restaurant\ItemController::class, 'toggle'])->name('items.toggle');
        Route::post('menu/items/{item}/duplicate', [Restaurant\ItemController::class, 'duplicate'])->name('items.duplicate');
        Route::delete('menu/items/{item}', [Restaurant\ItemController::class, 'destroy'])->name('items.destroy');

        Route::get('qr', [Restaurant\QrCodeController::class, 'index'])->name('qr.index');
        Route::post('qr', [Restaurant\QrCodeController::class, 'store'])->name('qr.store');
        Route::get('qr/print', [Restaurant\QrCodeController::class, 'print'])->name('qr.print');
        Route::put('qr/{qr}', [Restaurant\QrCodeController::class, 'update'])->name('qr.update');
        Route::delete('qr/{qr}', [Restaurant\QrCodeController::class, 'destroy'])->name('qr.destroy');

        Route::get('feedback', [Restaurant\FeedbackController::class, 'index'])->name('feedback.index');
        Route::patch('feedback/{feedback}', [Restaurant\FeedbackController::class, 'resolve'])->name('feedback.resolve');
        Route::put('feedback/alerts', [Restaurant\FeedbackController::class, 'updateAlerts'])->name('feedback.alerts');

        Route::get('plate-story', [Restaurant\PlateStoryController::class, 'index'])->name('plate-story.index');
        Route::put('plate-story/settings', [Restaurant\PlateStoryController::class, 'updateSettings'])->name('plate-story.settings');
        Route::post('plate-story/redeem', [Restaurant\PlateStoryController::class, 'redeem'])->name('plate-story.redeem');
        Route::patch('plate-story/{story}', [Restaurant\PlateStoryController::class, 'moderate'])->name('plate-story.moderate');

        Route::get('analytics', [Restaurant\AnalyticsController::class, 'index'])->name('analytics.index');

        Route::get('staff', [Restaurant\StaffController::class, 'index'])->name('staff.index');
        Route::post('staff', [Restaurant\StaffController::class, 'store'])->name('staff.store')->middleware('throttle:20,1');
        Route::put('staff/{user}', [Restaurant\StaffController::class, 'update'])->name('staff.update');
        Route::delete('staff/{user}', [Restaurant\StaffController::class, 'destroy'])->name('staff.destroy');

        Route::get('billing', [Restaurant\BillingController::class, 'index'])->name('billing.index');
        Route::post('billing/request', [Restaurant\BillingController::class, 'requestChange'])->name('billing.request')->middleware('throttle:5,1');
        Route::get('billing/invoices/{payment}', [Restaurant\BillingController::class, 'invoice'])->name('billing.invoice');

        Route::get('menu/export', [Restaurant\ImportController::class, 'export'])->name('menu.export');
        Route::get('menu/import', [Restaurant\ImportController::class, 'index'])->name('import.index');
        Route::post('menu/import', [Restaurant\ImportController::class, 'store'])->name('import.store');
        Route::get('menu/import/template', [Restaurant\ImportController::class, 'template'])->name('import.template');
        Route::get('menu/import/{batch}', [Restaurant\ImportController::class, 'show'])->name('import.show');
        Route::post('menu/import/{batch}/preview', [Restaurant\ImportController::class, 'preview'])->name('import.preview');
        Route::post('menu/import/{batch}/run', [Restaurant\ImportController::class, 'run'])->name('import.run');
        Route::get('menu/import/{batch}/errors', [Restaurant\ImportController::class, 'errors'])->name('import.errors');
    });

    // Super admin
    Route::middleware('super-admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/', [Admin\DashboardController::class, 'index'])->name('dashboard');

        Route::get('plans', [Admin\PlanController::class, 'index'])->name('plans.index');
        Route::post('plans', [Admin\PlanController::class, 'store'])->name('plans.store');
        Route::put('plans/{plan}', [Admin\PlanController::class, 'update'])->name('plans.update');
        Route::delete('plans/{plan}', [Admin\PlanController::class, 'destroy'])->name('plans.destroy');

        Route::get('restaurants', [Admin\RestaurantController::class, 'index'])->name('restaurants.index');
        Route::patch('restaurants/{restaurant}', [Admin\RestaurantController::class, 'update'])->name('restaurants.update');
        Route::delete('restaurants/{restaurant}', [Admin\RestaurantController::class, 'destroy'])->name('restaurants.destroy');
        Route::patch('restaurants/{restaurant}/restore', [Admin\RestaurantController::class, 'restore'])->name('restaurants.restore')->withTrashed();
        Route::delete('restaurants/{restaurant}/force', [Admin\RestaurantController::class, 'forceDestroy'])->name('restaurants.force-destroy')->withTrashed();

        Route::get('finance', [Admin\FinanceController::class, 'index'])->name('finance.index');
        Route::post('finance/payments', [Admin\FinanceController::class, 'store'])->name('finance.store');
        Route::get('finance/export', [Admin\FinanceController::class, 'export'])->name('finance.export');
        Route::patch('finance/payments/{payment}', [Admin\FinanceController::class, 'update'])->name('finance.update');
        Route::patch('finance/upgrades/{upgrade}', [Admin\FinanceController::class, 'handleUpgrade'])->name('finance.upgrades.handle');
        Route::get('finance/payments/{payment}/invoice', [Admin\FinanceController::class, 'invoice'])->name('finance.invoice');

        Route::get('website', [Admin\WebsiteController::class, 'edit'])->name('website.edit');
        Route::put('website/{slug}', [Admin\WebsiteController::class, 'update'])->name('website.update');
        Route::delete('website/{slug}', [Admin\WebsiteController::class, 'reset'])->name('website.reset');

        Route::get('blog', [Admin\BlogPostController::class, 'index'])->name('blog.index');
        Route::get('blog/create', [Admin\BlogPostController::class, 'create'])->name('blog.create');
        Route::post('blog', [Admin\BlogPostController::class, 'store'])->name('blog.store');
        Route::get('blog/{post}/edit', [Admin\BlogPostController::class, 'edit'])->name('blog.edit');
        Route::put('blog/{post}', [Admin\BlogPostController::class, 'update'])->name('blog.update');
        Route::delete('blog/{post}', [Admin\BlogPostController::class, 'destroy'])->name('blog.destroy');

        Route::get('users', [Admin\UserController::class, 'index'])->name('users.index');
        Route::patch('users/{user}', [Admin\UserController::class, 'update'])->name('users.update');
        Route::post('users/{user}/reset', [Admin\UserController::class, 'sendReset'])->name('users.reset')->middleware('throttle:10,1');
        Route::delete('users/{user}', [Admin\UserController::class, 'destroy'])->name('users.destroy');

        Route::get('analytics', [Admin\AnalyticsController::class, 'index'])->name('analytics.index');

        Route::get('messages', [Admin\ContactMessageController::class, 'index'])->name('messages.index');
        Route::patch('messages/{message}', [Admin\ContactMessageController::class, 'update'])->name('messages.update');
        Route::delete('messages/{message}', [Admin\ContactMessageController::class, 'destroy'])->name('messages.destroy');

        Route::get('marketplace', [Admin\MarketplaceController::class, 'index'])->name('marketplace.index');
        Route::post('marketplace/ads', [Admin\MarketplaceController::class, 'store'])->name('marketplace.store');
        Route::post('marketplace/ads/{ad}', [Admin\MarketplaceController::class, 'update'])->name('marketplace.update'); // POST: multipart image upload
        Route::delete('marketplace/ads/{ad}', [Admin\MarketplaceController::class, 'destroy'])->name('marketplace.destroy');

        Route::get('settings', [Admin\SettingsController::class, 'edit'])->name('settings.edit');
        Route::post('settings', [Admin\SettingsController::class, 'update'])->name('settings.update');
    });
});

require __DIR__.'/settings.php';

/*
| Guest menus — keep these LAST: {restaurant} is a catch-all slug.
*/
Route::get('q/{code}', [PublicMenuController::class, 'qr'])->name('menu.qr')->where('code', '[a-z0-9]{4,32}');
Route::post('m/{restaurant}/e', [PublicMenuController::class, 'event'])
    ->name('menu.event')
    ->middleware('throttle:menu-events')
    ->withoutMiddleware(PreventRequestForgery::class);
Route::post('{restaurant}/feedback', [PublicMenuController::class, 'feedback'])
    ->name('menu.feedback')
    ->middleware('throttle:10,1')
    ->where('restaurant', '[a-z0-9][a-z0-9_-]*');
Route::post('{restaurant}/plate-story', [\App\Http\Controllers\Public\PlateStoryController::class, 'store'])
    ->name('menu.plate-story')
    ->middleware('throttle:6,1')
    ->where('restaurant', '[a-z0-9][a-z0-9_-]*');
Route::get('{restaurant}', [PublicMenuController::class, 'show'])
    ->name('menu.show')
    ->where('restaurant', '(?!(?:'.implode('|', array_map('preg_quote', \App\Actions\Restaurants\CreateRestaurant::RESERVED)).')$)[a-z0-9][a-z0-9_-]*');
