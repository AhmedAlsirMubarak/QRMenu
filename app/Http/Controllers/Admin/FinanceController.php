<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\UpgradeRequest;
use App\Models\Restaurant;
use App\Models\SiteSetting;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\Spreadsheet\SpreadsheetWriter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FinanceController extends Controller
{
    public const METHODS = ['card' => 'Card', 'bank_transfer' => 'Bank transfer', 'cash' => 'Cash', 'other' => 'Other'];

    public const TYPES = ['subscription' => 'Subscription', 'advertising' => 'Advertising', 'other' => 'Other'];

    public const STATUSES = ['pending', 'paid', 'overdue', 'failed', 'refunded'];

    public function index(Request $request): Response
    {
        $currency = SiteSetting::get('default_currency', 'OMR');
        $monthStart = now()->startOfMonth();

        $paidThisMonth = Payment::where('status', 'paid')->where('paid_at', '>=', $monthStart);
        $lastMonth = (float) Payment::where('status', 'paid')->whereBetween('paid_at', [$monthStart->copy()->subMonth(), $monthStart])->sum('amount');
        $thisMonth = (float) (clone $paidThisMonth)->sum('amount');

        $activeSubs = Subscription::withoutRestaurantScope()->whereIn('status', ['active', 'past_due'])->with('plan:id,name')->get();
        $mrr = $activeSubs->sum(fn ($s) => $s->billing_cycle === 'yearly' ? (float) $s->price / 12 : (float) $s->price);

        // Revenue by month (last 6 months), split by type.
        $since = $monthStart->copy()->subMonths(5);
        $byMonth = Payment::where('status', 'paid')->where('paid_at', '>=', $since)->get(['amount', 'type', 'paid_at'])
            ->groupBy(fn ($p) => $p->paid_at->format('Y-m'));
        $revenue = collect(range(0, 5))->map(function ($i) use ($since, $byMonth) {
            $month = $since->copy()->addMonths($i);
            $rows = $byMonth->get($month->format('Y-m'), collect());

            return [
                'month' => $month->format('M'),
                'subscriptions' => round((float) $rows->where('type', 'subscription')->sum('amount'), 3),
                'advertising' => round((float) $rows->where('type', 'advertising')->sum('amount'), 3),
                'other' => round((float) $rows->where('type', 'other')->sum('amount'), 3),
            ];
        });

        $overdue = $this->overdueQuery();

        $payments = Payment::query()
            ->with('restaurant:id,name,slug')
            ->when($request->string('search')->toString(), fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('invoice_number', 'like', "%{$s}%")
                ->orWhere('payer_name', 'like', "%{$s}%")
                ->orWhereHas('restaurant', fn ($r) => $r->where('name', 'like', "%{$s}%"))))
            ->when($request->query('status') === 'overdue', fn ($q) => $q->where(fn ($q) => $this->scopeOverdue($q)))
            ->when(in_array($request->query('status'), ['pending', 'paid', 'failed', 'refunded'], true), fn ($q) => $q->where('status', $request->query('status')))
            ->when(array_key_exists((string) $request->query('type'), self::TYPES), fn ($q) => $q->where('type', $request->query('type')))
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Payment $p) => $p->toArray() + ['display_status' => $this->displayStatus($p)]);

        return Inertia::render('admin/finance/index', [
            'currency' => $currency,
            'kpis' => [
                'revenue_month' => round($thisMonth, 3),
                'revenue_change' => $lastMonth > 0 ? round(($thisMonth - $lastMonth) / $lastMonth * 100) : null,
                'mrr' => round($mrr, 3),
                'active_subscriptions' => $activeSubs->count(),
                'ad_revenue_month' => round((float) (clone $paidThisMonth)->where('type', 'advertising')->sum('amount'), 3),
                'overdue_amount' => round((float) (clone $overdue)->sum('amount'), 3),
                'overdue_count' => (clone $overdue)->count(),
                'trials_ending' => Subscription::withoutRestaurantScope()->where('status', 'trialing')->whereBetween('trial_ends_at', [now(), now()->addDays(7)])->count(),
                'new_this_month' => Subscription::withoutRestaurantScope()->where('created_at', '>=', $monthStart)->count(),
                'cancelled_this_month' => Subscription::withoutRestaurantScope()->where('cancelled_at', '>=', $monthStart)->count(),
            ],
            'revenue' => $revenue,
            'mrrByPlan' => $activeSubs->groupBy('subscription_plan_id')->map(fn ($subs) => [
                'plan' => $subs->first()->plan?->translate('name') ?? '—',
                'count' => $subs->count(),
                'mrr' => round($subs->sum(fn ($s) => $s->billing_cycle === 'yearly' ? (float) $s->price / 12 : (float) $s->price), 3),
            ])->sortByDesc('mrr')->values(),
            'expiring' => Subscription::withoutRestaurantScope()
                ->whereIn('status', ['active', 'past_due', 'trialing'])
                ->where(fn ($q) => $q->whereBetween('ends_at', [now()->subDays(30), now()->addDays(14)])->orWhereBetween('trial_ends_at', [now()->subDays(30), now()->addDays(7)]))
                ->with(['restaurant:id,name', 'plan:id,name'])
                ->orderByRaw('coalesce(ends_at, trial_ends_at)')
                ->limit(10)->get()
                ->map(fn ($s) => [
                    'restaurant_id' => $s->restaurant_id,
                    'restaurant' => $s->restaurant?->name,
                    'plan' => $s->plan?->translate('name'),
                    'status' => $s->status,
                    'date' => ($s->status === 'trialing' ? $s->trial_ends_at : $s->ends_at)?->toDateString(),
                ]),
            'payments' => $payments,
            'upgradeRequests' => UpgradeRequest::withoutRestaurantScope()->whereNull('handled_at')->latest()->limit(10)
                ->with(['restaurant:id,name', 'plan:id,name', 'user:id,name,email'])->get()
                ->map(fn (UpgradeRequest $u) => [
                    'id' => $u->id,
                    'restaurant_id' => $u->restaurant_id,
                    'restaurant' => $u->restaurant?->name,
                    'plan' => $u->plan?->translate('name'),
                    'billing_cycle' => $u->billing_cycle,
                    'message' => $u->message,
                    'by' => $u->user ? "{$u->user->name} · {$u->user->email}" : null,
                    'created_at' => $u->created_at->toDateString(),
                ]),
            'filters' => $request->only('search', 'status', 'type'),
            'options' => [
                'methods' => self::METHODS,
                'types' => self::TYPES,
                'statuses' => self::STATUSES,
                'restaurants' => Restaurant::orderBy('name')->get(['id', 'name']),
                'plans' => SubscriptionPlan::where('is_active', true)->ordered()->get(['id', 'name', 'price_monthly', 'price_yearly', 'currency']),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayment($request);

        DB::transaction(function () use ($data, $request) {
            $payment = Payment::create(array_merge(collect($data)->except(['extend', 'plan_id', 'billing_cycle'])->all(), [
                'invoice_number' => Payment::nextInvoiceNumber(),
                'recorded_by' => $request->user()->id,
                'paid_at' => $data['status'] === 'paid' ? ($data['paid_at'] ?? now()) : null,
            ]));

            if (($data['extend'] ?? false) && $data['status'] === 'paid' && $payment->restaurant_id) {
                $payment->update(['subscription_id' => $this->extendSubscription($payment->restaurant_id, (int) $data['plan_id'], $data['billing_cycle'], (float) $data['amount'], $data['currency'])->id]);
            }
        });

        $this->toast('Payment recorded.');

        return back();
    }

    public function update(Request $request, Payment $payment): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
            'reference' => ['nullable', 'string', 'max:120'],
        ]);

        $payment->update($data + ['paid_at' => $data['status'] === 'paid' ? ($payment->paid_at ?? now()) : $payment->paid_at]);
        $this->toast("{$payment->invoice_number} marked as {$data['status']}.");

        return back();
    }

    public function invoice(Payment $payment): Response
    {
        return Inertia::render('admin/finance/invoice', [
            'payment' => $payment->load('restaurant:id,name,phone,email')->toArray() + ['display_status' => $this->displayStatus($payment)],
            'issuer' => [
                'name' => SiteSetting::get('brand_name', 'QRMenu'),
                'email' => SiteSetting::get('support_email'),
                'logo' => SiteSetting::get('brand_logo'),
            ],
            'methods' => self::METHODS,
            'types' => self::TYPES,
        ]);
    }

    public function export(Request $request): BinaryFileResponse
    {
        $range = $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date']]);
        $rows = [['Invoice', 'Date', 'Client', 'Type', 'Description', 'Amount', 'Currency', 'Method', 'Status', 'Paid at', 'Reference']];

        Payment::with('restaurant:id,name')
            ->when($range['from'] ?? null, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($range['to'] ?? null, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->orderBy('id')
            ->each(function (Payment $p) use (&$rows) {
                $rows[] = [$p->invoice_number, $p->created_at->toDateString(), $p->restaurant?->name ?? $p->payer_name, self::TYPES[$p->type] ?? $p->type,
                    $p->description, $p->amount, $p->currency, self::METHODS[$p->method] ?? $p->method, $this->displayStatus($p), $p->paid_at?->toDateTimeString(), $p->reference];
            });

        $format = $request->query('format') === 'csv' ? 'csv' : 'xlsx';
        $path = tempnam(sys_get_temp_dir(), 'fin').'.'.$format;
        SpreadsheetWriter::write($path, $rows, $format);

        return response()->download($path, 'payments-'.now()->format('Y-m-d').'.'.$format)->deleteFileAfterSend();
    }

    protected function validatePayment(Request $request): array
    {
        return $request->validate([
            'restaurant_id' => ['nullable', 'required_without:payer_name', Rule::exists('restaurants', 'id')],
            'payer_name' => ['nullable', 'required_without:restaurant_id', 'string', 'max:120'],
            'type' => ['required', Rule::in(array_keys(self::TYPES))],
            'description' => ['nullable', 'string', 'max:200'],
            'amount' => ['required', 'numeric', 'min:0', 'max:999999'],
            'currency' => ['required', Rule::in(array_keys(config('qrmenu.currencies')))],
            'method' => ['nullable', Rule::in(array_keys(self::METHODS))],
            'status' => ['required', Rule::in(['pending', 'paid'])],
            'due_date' => ['nullable', 'date'],
            'paid_at' => ['nullable', 'date'],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'extend' => ['boolean'],
            'plan_id' => ['nullable', 'required_if_accepted:extend', Rule::exists('subscription_plans', 'id')],
            'billing_cycle' => ['nullable', 'required_if_accepted:extend', Rule::in(['monthly', 'yearly'])],
        ]);
    }

    /** Paid → subscription becomes active and runs one more month/year from today or from its current end. */
    protected function extendSubscription(int $restaurantId, int $planId, string $cycle, float $amount, string $currency): Subscription
    {
        $subscription = Subscription::withoutRestaurantScope()->where('restaurant_id', $restaurantId)->latest('id')->first();
        $start = $subscription?->ends_at && $subscription->ends_at->isFuture() ? $subscription->ends_at : now();
        $end = $cycle === 'yearly' ? $start->addYear() : $start->addMonth();

        $attributes = [
            'subscription_plan_id' => $planId,
            'billing_cycle' => $cycle,
            'price' => $amount,
            'currency' => $currency,
            'status' => 'active',
            'starts_at' => $subscription?->starts_at ?? now(),
            'ends_at' => $end,
            'cancelled_at' => null,
            'expired_at' => null, // renewed: stops the win-back / clean-up clock
        ];

        if ($subscription) {
            $subscription->update($attributes);

            return $subscription;
        }

        return Subscription::create($attributes + ['restaurant_id' => $restaurantId]);
    }

    protected function overdueQuery(): Builder
    {
        return Payment::query()->where(fn ($q) => $this->scopeOverdue($q));
    }

    protected function scopeOverdue(Builder $q): void
    {
        $q->where('status', 'overdue')->orWhere(fn ($q) => $q->where('status', 'pending')->whereDate('due_date', '<', now()));
    }

    /** Marks a restaurant's plan-change request as dealt with (after changing their subscription). */
    public function handleUpgrade(int $upgrade): RedirectResponse
    {
        UpgradeRequest::withoutRestaurantScope()->findOrFail($upgrade)->update(['handled_at' => now()]);
        $this->toast('Request marked as handled.');

        return back();
    }

    protected function displayStatus(Payment $p): string
    {
        return $p->displayStatus();
    }
}
