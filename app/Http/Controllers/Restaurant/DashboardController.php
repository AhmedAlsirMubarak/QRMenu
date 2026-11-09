<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CustomerFeedback;
use App\Models\MenuCategory;
use App\Models\MenuEvent;
use App\Models\MenuItem;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(CurrentRestaurant $current): Response
    {
        $restaurant = $current->get()->load('subscription.plan');
        $since = now()->subDays(30);

        // All queries below are automatically limited to this restaurant (BelongsToRestaurant scope).
        return Inertia::render('restaurant/dashboard', [
            'stats' => [
                'scans_30d' => MenuEvent::where('event', 'scan')->where('created_at', '>=', $since)->count(),
                'menu_views_30d' => MenuEvent::where('event', 'menu_view')->where('created_at', '>=', $since)->count(),
                'feedback_30d' => CustomerFeedback::where('created_at', '>=', $since)->count(),
                'avg_rating' => round((float) CustomerFeedback::where('created_at', '>=', $since)->avg('overall_rating'), 1),
                'categories' => MenuCategory::count(),
                'items' => MenuItem::count(),
                'branches' => Branch::count(),
            ],
            'setup' => [
                'has_categories' => MenuCategory::exists(),
                'has_items' => MenuItem::exists(),
                'has_item_photos' => MenuItem::whereNotNull('image_path')->exists(),
                'has_logo' => (bool) $restaurant->logo_path,
                'has_google_url' => (bool) $restaurant->google_review_url,
            ],
            'subscription' => $restaurant->subscription,
            'menuUrl' => url($restaurant->slug),
        ]);
    }

    public function switch(Request $request): RedirectResponse
    {
        $id = (int) $request->input('restaurant_id');
        abort_unless($request->user()->restaurants()->whereKey($id)->exists(), 403);
        $request->user()->forceFill(['current_restaurant_id' => $id])->save();

        return redirect()->route('restaurant.dashboard');
    }
}
