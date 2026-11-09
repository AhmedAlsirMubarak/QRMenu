<?php

namespace App\Http\Controllers;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\SubscriptionPlan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()->activeRestaurant()) {
            return redirect()->route('restaurant.dashboard');
        }

        $plans = SubscriptionPlan::query()->where('is_active', true)->where('is_public', true)->ordered()
            ->get(['id', 'name', 'price_monthly', 'currency', 'trial_days']);

        // Plan picked on the website's pricing section (see RememberChosenPlan).
        $chosen = (int) ($request->query('plan') ?? $request->session()->get('onboarding.plan'));

        return Inertia::render('onboarding/create', [
            'languages' => config('qrmenu.languages'),
            'currencies' => config('qrmenu.currencies'),
            'plans' => $plans,
            'chosenPlanId' => $plans->contains('id', $chosen) ? $chosen : null,
        ]);
    }

    public function store(Request $request, CreateRestaurant $createRestaurant): RedirectResponse
    {
        $languageKeys = array_keys(config('qrmenu.languages'));

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:60', 'alpha_dash', Rule::notIn(CreateRestaurant::RESERVED)],
            'main_language' => ['required', Rule::in($languageKeys)],
            'languages' => ['array'],
            'languages.*' => [Rule::in($languageKeys)],
            'currency' => ['required', Rule::in(array_keys(config('qrmenu.currencies')))],
            'city' => ['nullable', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:30'],
            'plan_id' => ['nullable', Rule::exists('subscription_plans', 'id')->where('is_active', true)->whereNull('deleted_at')],
        ], ['slug.not_in' => 'That web address is reserved by QRMenu. Please choose another.'], ['slug' => 'web address']);

        $createRestaurant->handle($request->user(), $data);
        $request->session()->forget('onboarding.plan');

        $this->toast('Your restaurant is ready. Let’s build your menu!', 'success');

        return redirect()->route('restaurant.dashboard');
    }
}
