<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pricing buttons link to /register?plan=ID (or /login?plan=ID). The choice is kept in the
 * session so onboarding can pre-select it after sign-up and e-mail verification.
 */
class RememberChosenPlan
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('GET') && ctype_digit((string) $request->query('plan'))) {
            $request->session()->put('onboarding.plan', (int) $request->query('plan'));
        }

        return $next($request);
    }
}
