<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\MenuItem;
use App\Models\Payment;
use App\Models\SiteSetting;
use App\Models\SubscriptionPlan;
use App\Models\UpgradeRequest;
use App\Notifications\UpgradeRequested;
use App\Services\PlanLimits;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** The restaurant's own plan, usage, invoices and plan-change requests. Payments are recorded by the super admin. */
class BillingController extends Controller
{
    public function index(CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-billing');
        $restaurant = $current->get();
        $subscription = $restaurant->subscription()->with('plan')->first();
        $limits = PlanLimits::for($restaurant);

        $languages = count($restaurant->languages ?? []);
        $pending = UpgradeRequest::query()->whereNull('handled_at')->latest()->with('plan')->first();

        return Inertia::render('restaurant/billing', [
            'subscription' => $subscription ? [
                'plan_id' => $subscription->subscription_plan_id,
                'plan' => $subscription->plan?->translate('name'),
                'status' => $subscription->status,
                'usable' => $subscription->isUsable(),
                'billing_cycle' => $subscription->billing_cycle,
                'price' => $subscription->price,
                'currency' => $subscription->currency,
                'trial_ends_at' => $subscription->trial_ends_at?->toDateString(),
                'ends_at' => $subscription->ends_at?->toDateString(),
            ] : null,
            'usage' => [
                ['label' => 'Branches', 'used' => Branch::count(), 'max' => $limits->maxBranches()],
                ['label' => 'Dishes', 'used' => MenuItem::count(), 'max' => $limits->maxItems()],
                ['label' => 'Languages', 'used' => $languages, 'max' => $limits->maxLanguages()],
            ],
            'features' => $limits->toArray()['features'],
            'featureLabels' => SubscriptionPlan::FEATURES,
            'plans' => SubscriptionPlan::query()->where('is_active', true)->where('is_public', true)->ordered()
                ->get(['id', 'name', 'description', 'price_monthly', 'price_yearly', 'currency', 'max_branches', 'max_languages', 'max_items', 'features', 'is_featured']),
            'payments' => Payment::query()->where('restaurant_id', $restaurant->id)->latest('id')->limit(50)->get()
                ->map(fn (Payment $p) => [
                    'id' => $p->id, 'invoice_number' => $p->invoice_number, 'description' => $p->description,
                    'amount' => $p->amount, 'currency' => $p->currency, 'status' => $p->displayStatus(),
                    'due_date' => $p->due_date?->toDateString(), 'paid_at' => $p->paid_at?->toDateString(), 'created_at' => $p->created_at->toDateString(),
                ]),
            'pendingRequest' => $pending ? [
                'plan' => $pending->plan?->translate('name'),
                'billing_cycle' => $pending->billing_cycle,
                'created_at' => $pending->created_at->toDateString(),
            ] : null,
            'supportEmail' => SiteSetting::get('support_email'),
        ]);
    }

    public function requestChange(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-billing');

        $data = $request->validate([
            'plan_id' => ['required', Rule::exists('subscription_plans', 'id')->where('is_active', true)->whereNull('deleted_at')],
            'billing_cycle' => ['required', Rule::in(['monthly', 'yearly'])],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        if (UpgradeRequest::query()->whereNull('handled_at')->where('created_at', '>', now()->subDay())->exists()) {
            $this->toast('We already have your request — our team will contact you shortly.', 'info');

            return back();
        }

        $upgrade = UpgradeRequest::create([
            'user_id' => $request->user()->id,
            'subscription_plan_id' => $data['plan_id'],
            'billing_cycle' => $data['billing_cycle'],
            'message' => $data['message'] ?? null,
        ]);

        if ($email = SiteSetting::get('support_email')) {
            Notification::route('mail', $email)->notify(new UpgradeRequested($upgrade));
        }

        $this->toast('Request sent. Our team will contact you to complete the change.', 'success');

        return back();
    }

    public function invoice(CurrentRestaurant $current, Payment $payment): Response
    {
        Gate::authorize('manage-billing');
        // Payments are platform records (not tenant scoped): only this restaurant's invoices.
        abort_unless($payment->restaurant_id === $current->id(), 404);

        return Inertia::render('admin/finance/invoice', [
            'payment' => $payment->load('restaurant:id,name,phone,email')->toArray() + ['display_status' => $payment->displayStatus()],
            'issuer' => [
                'name' => SiteSetting::get('brand_name', 'QRMenu'),
                'email' => SiteSetting::get('support_email'),
                'logo' => SiteSetting::get('brand_logo'),
            ],
            'methods' => FinanceController::METHODS,
            'types' => FinanceController::TYPES,
        ]);
    }
}
