<?php

namespace App\Http\Middleware;

use App\Support\CurrentRestaurant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * For the restaurant dashboard: resolves which restaurant the signed-in user is
 * working on (must be a member) and switches tenant scoping on for the request.
 */
class SetCurrentRestaurant
{
    public function __construct(protected CurrentRestaurant $current) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $restaurant = $user?->activeRestaurant();

        if (! $restaurant) {
            return redirect()->route('onboarding.create');
        }

        abort_if($restaurant->status === 'suspended', 403, 'This restaurant account is suspended. Please contact support.');

        $this->current->set($restaurant);
        $request->attributes->set('restaurant_role', $user->roleIn($restaurant));

        return $next($request);
    }
}
