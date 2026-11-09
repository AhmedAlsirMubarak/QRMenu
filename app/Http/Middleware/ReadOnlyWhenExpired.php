<?php

namespace App\Http\Middleware;

use App\Support\CurrentRestaurant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * When a restaurant's plan has expired (after any grace period), its dashboard becomes read-only:
 * pages still open and the menu can be exported, but nothing can be changed until it renews.
 * Billing (plan-change requests) and switching restaurants keep working.
 */
class ReadOnlyWhenExpired
{
    public const ALLOWED = ['restaurant.billing.*', 'restaurant.switch', 'restaurant.menu.export'];

    public function __construct(protected CurrentRestaurant $current) {}

    public function handle(Request $request, Closure $next): Response
    {
        $restaurant = $this->current->get();

        if ($restaurant && ! $request->isMethodSafe() && ! $request->routeIs(...self::ALLOWED)
            && ! ($restaurant->subscription?->isUsable() ?? false)) {
            if ($request->expectsJson()) {
                abort(403, 'Your plan has expired. Renew to make changes.');
            }

            \Inertia\Inertia::flash('toast', ['message' => 'Your plan has expired, so your dashboard is read-only. Renew in Billing to make changes.', 'type' => 'error']);

            return back();
        }

        return $next($request);
    }
}
