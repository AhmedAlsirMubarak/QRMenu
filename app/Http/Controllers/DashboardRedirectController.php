<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** /dashboard sends each user to the right place after login. */
class DashboardRedirectController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        if ($user->activeRestaurant()) {
            return redirect()->route('restaurant.dashboard');
        }

        return redirect()->route('onboarding.create');
    }
}
