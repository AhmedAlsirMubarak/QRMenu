<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PlanRequest;
use App\Models\SubscriptionPlan;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    public function index(): Response
    {
        $plans = SubscriptionPlan::query()
            ->ordered()
            ->withCount(['subscriptions as active_subscriptions_count' => fn ($q) => $q->whereIn('status', ['trialing', 'active', 'past_due'])])
            ->get();

        return Inertia::render('admin/plans/index', [
            'plans' => $plans,
            'features' => SubscriptionPlan::FEATURES,
            'currencies' => array_keys(config('qrmenu.currencies')),
        ]);
    }

    public function store(PlanRequest $request): RedirectResponse
    {
        SubscriptionPlan::create($request->validated());

        $this->toast('Plan created.', 'success');

        return back();
    }

    public function update(PlanRequest $request, SubscriptionPlan $plan): RedirectResponse
    {
        // Price changes apply to new subscriptions; existing ones keep their price until renewal.
        $plan->update($request->validated());

        $this->toast('Plan saved.', 'success');

        return back();
    }

    public function destroy(SubscriptionPlan $plan): RedirectResponse
    {
        $active = $plan->subscriptions()->whereIn('status', ['trialing', 'active', 'past_due'])->count();

        if ($active > 0) {
            $this->toast("This plan has {$active} active subscription(s). Hide it from the website instead, or move those restaurants to another plan first.", 'error');

            return back();
        }

        $plan->delete(); // soft delete keeps invoice history intact

        $this->toast('Plan deleted.', 'success');

        return back();
    }
}
