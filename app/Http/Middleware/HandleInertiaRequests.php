<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use App\Support\CurrentRestaurant;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'brand' => fn () => [
                'name' => SiteSetting::get('brand_name', config('app.name')),
                'logo' => SiteSetting::get('brand_logo'),
            ],
            'auth' => [
                'user' => $request->user(),
                'isSuperAdmin' => (bool) $request->user()?->isSuperAdmin(),
            ],
            // Unread contact-form messages, for the badge in the super admin sidebar.
            'adminInbox' => fn () => $request->user()?->isSuperAdmin() && $request->routeIs('admin.*', 'settings.*', 'profile.*', 'security.*', 'appearance.*')
                ? \App\Models\ContactMessage::where('status', 'new')->count()
                : null,
            // Set only inside the restaurant dashboard (after SetCurrentRestaurant middleware).
            'restaurant' => function () use ($request) {
                $restaurant = app(CurrentRestaurant::class)->get();
                $user = $request->user();

                // Account pages (/settings/…) sit inside the restaurant dashboard too, but run without its middleware.
                $onAccount = $request->is('settings/*') && $user && ! $user->isSuperAdmin();
                if (! $restaurant && $onAccount) {
                    $restaurant = $user->activeRestaurant();
                }

                // Only for the signed-in restaurant dashboard — guest menus pass their own data.
                if (! $restaurant || ! $user || ! ($request->routeIs('restaurant.*') || $onAccount)) {
                    return null;
                }

                return [
                    'id' => $restaurant->id,
                    'name' => $restaurant->name,
                    'slug' => $restaurant->slug,
                    'logo' => $restaurant->logo_url,
                    'currency' => $restaurant->currency,
                    'menu_live' => (bool) $restaurant->subscription?->isUsable(),
                    'subscription_status' => $restaurant->subscription?->status,
                    // For the "ends soon" / "unpaid invoice" banners in the restaurant dashboard.
                    'subscription_ends_at' => ($restaurant->subscription?->status === 'trialing' ? $restaurant->subscription?->trial_ends_at : $restaurant->subscription?->ends_at)?->toIso8601String(),
                    'unpaid_invoices' => \App\Models\Payment::where('restaurant_id', $restaurant->id)->whereIn('status', ['pending', 'overdue'])
                        ->orderBy('due_date')->get(['id', 'invoice_number', 'amount', 'currency', 'due_date', 'status'])
                        ->map(fn ($p) => ['id' => $p->id, 'number' => $p->invoice_number, 'amount' => $p->amount, 'currency' => $p->currency, 'due_date' => $p->due_date?->toDateString(), 'overdue' => $p->displayStatus() === 'overdue' || $p->status === 'overdue']),
                    'main_language' => $restaurant->main_language,
                    'languages' => $restaurant->languages,
                    'role' => ($request->attributes->get('restaurant_role') ?? $user->roleIn($restaurant))?->value,
                    'memberships' => $request->user()->restaurants()->get(['restaurants.id', 'restaurants.name'])
                        ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name]),
                ];
            },
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
