<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuEvent;
use App\Models\MenuItem;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\Subscription;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'restaurants' => Restaurant::count(),
                'active_subscriptions' => Subscription::withoutRestaurantScope()->whereIn('status', ['active', 'past_due'])->count(),
                'trials' => Subscription::withoutRestaurantScope()->where('status', 'trialing')->count(),
                'menu_items' => MenuItem::withoutRestaurantScope()->count(),
                'scans_30d' => MenuEvent::withoutRestaurantScope()->where('event', 'scan')->where('created_at', '>=', now()->subDays(30))->count(),
                'revenue_month' => (string) Payment::where('status', 'paid')->where('paid_at', '>=', now()->startOfMonth())->sum('amount'),
            ],
            'recentRestaurants' => Restaurant::query()->latest()->limit(8)
                ->with('subscription.plan:id,name')
                ->get(['id', 'name', 'slug', 'status', 'currency', 'created_at']),
        ]);
    }
}
