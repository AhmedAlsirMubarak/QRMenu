<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdCampaign;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\SiteSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Paid placements on the public Marketplace, plus who is listed there. */
class MarketplaceController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        $campaigns = AdCampaign::query()
            ->with(['restaurant:id,name,slug', 'payment:id,invoice_number,status,due_date'])
            ->when($request->query('slot'), fn ($q, $slot) => $q->where('slot', $slot))
            ->when($status === 'live', fn ($q) => $q->live())
            ->when($status === 'scheduled', fn ($q) => $q->where('is_paused', false)->where('starts_at', '>', now()))
            ->when($status === 'ended', fn ($q) => $q->where('ends_at', '<', now()))
            ->when($status === 'paused', fn ($q) => $q->where('is_paused', true))
            ->latest('starts_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (AdCampaign $ad) => $ad->toArray() + [
                'advertiser' => $ad->advertiser(),
                'ctr' => $ad->impressions ? round($ad->clicks / $ad->impressions * 100, 1) : null,
                'payment_status' => $ad->payment?->displayStatus(),
            ]);

        $live = AdCampaign::query()->live();

        return Inertia::render('admin/marketplace/index', [
            'campaigns' => $campaigns,
            'filters' => $request->only('slot', 'status'),
            'slots' => AdCampaign::SLOTS,
            'lineup' => $this->lineup(),
            'kpis' => [
                'live' => (clone $live)->count(),
                'impressions' => (int) (clone $live)->sum('impressions'),
                'clicks' => (int) (clone $live)->sum('clicks'),
                'revenue_month' => round((float) Payment::where('type', 'advertising')->where('status', 'paid')->where('paid_at', '>=', now()->startOfMonth())->sum('amount'), 3),
                'listed' => Restaurant::where('marketplace_listed', true)->where('status', 'active')->count(),
            ],
            'restaurants' => Restaurant::query()->where('status', 'active')->orderBy('name')->get(['id', 'name', 'marketplace_listed']),
            'currency' => SiteSetting::get('default_currency', 'OMR'),
            'cities' => \App\Models\Branch::withoutRestaurantScope()->whereNotNull('city')->distinct()->orderBy('city')->pluck('city'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($data, $request) {
            $ad = AdCampaign::create($this->attributes($data, $request));
            $this->recordPayment($ad, $data, $request);
        });

        $this->toast('Campaign created.', 'success');

        return back();
    }

    public function update(Request $request, AdCampaign $ad): RedirectResponse
    {
        if ($request->has('is_paused') && count($request->except(['_method'])) === 1) {
            $ad->update(['is_paused' => $request->boolean('is_paused')]);
            $this->toast($ad->is_paused ? 'Campaign paused.' : 'Campaign resumed.');

            return back();
        }

        $data = $this->validated($request, $ad);

        DB::transaction(function () use ($ad, $data, $request) {
            $ad->update($this->attributes($data, $request, $ad));
            if (! $ad->payment_id) {
                $this->recordPayment($ad, $data, $request);
            }
        });

        $this->toast('Campaign saved.');

        return back();
    }

    public function destroy(AdCampaign $ad): RedirectResponse
    {
        $ad->delete();
        $this->toast('Campaign deleted. Its invoice (if any) is kept in Finance.');

        return back();
    }

    protected function validated(Request $request, ?AdCampaign $ad = null): array
    {
        $data = $request->validate([
            'advertiser_type' => ['required', Rule::in(['restaurant', 'external'])],
            'restaurant_id' => ['nullable', 'required_if:advertiser_type,restaurant', Rule::exists('restaurants', 'id')->whereNull('deleted_at')],
            'advertiser_name' => ['nullable', 'required_if:advertiser_type,external', 'string', 'max:120'],
            'slot' => ['required', Rule::in(array_keys(AdCampaign::SLOTS))],
            'title.en' => ['required', 'string', 'max:80'],
            'title.ar' => ['nullable', 'string', 'max:80'],
            'subtitle.en' => ['nullable', 'string', 'max:160'],
            'subtitle.ar' => ['nullable', 'string', 'max:160'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['boolean'],
            'link_url' => ['nullable', 'required_if:advertiser_type,external', 'url:http,https', 'max:255'],
            'city' => ['nullable', 'string', 'max:80'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'price' => ['required', 'numeric', 'min:0', 'max:99999'],
            'priority' => ['nullable', 'integer', 'between:1,10'],
            'currency' => ['required', Rule::in(array_keys(config('qrmenu.currencies')))],
            'record_payment' => ['boolean'],
            'payment_status' => ['nullable', Rule::in(['paid', 'pending'])],
        ], [
            'restaurant_id.required_if' => 'Choose the restaurant that is advertising.',
            'advertiser_name.required_if' => 'Enter the advertiser’s name.',
            'link_url.required_if' => 'External ads need a website link.',
        ]);

        if (in_array($data['slot'], ['sponsored', 'offer'], true) && $data['advertiser_type'] !== 'restaurant') {
            throw ValidationException::withMessages(['slot' => 'Sponsored listings and offer badges are for restaurants on the platform.']);
        }

        return $data;
    }

    protected function attributes(array $data, Request $request, ?AdCampaign $ad = null): array
    {
        $attrs = [
            'advertiser_type' => $data['advertiser_type'],
            'restaurant_id' => $data['advertiser_type'] === 'restaurant' ? $data['restaurant_id'] : null,
            'advertiser_name' => $data['advertiser_type'] === 'external' ? $data['advertiser_name'] : null,
            'slot' => $data['slot'],
            'title' => array_filter($data['title'] ?? []),
            'subtitle' => array_filter($data['subtitle'] ?? []) ?: null,
            'link_url' => $data['advertiser_type'] === 'external' ? $data['link_url'] : null,
            'city' => $data['city'] ?? null,
            'starts_at' => Carbon::parse($data['starts_at']),
            // A date-only "ends" means the campaign runs through that whole day.
            'ends_at' => strlen($data['ends_at']) <= 10 ? Carbon::parse($data['ends_at'])->endOfDay() : Carbon::parse($data['ends_at']),
            'price' => $data['price'],
            'currency' => $data['currency'],
            'priority' => $data['priority'] ?? 5,
        ];

        if ($request->hasFile('image')) {
            if ($ad?->image_path) {
                Storage::disk('public')->delete($ad->image_path);
            }
            $attrs['image_path'] = $request->file('image')->store('ads', 'public');
        } elseif (! empty($data['remove_image']) && $ad?->image_path) {
            Storage::disk('public')->delete($ad->image_path);
            $attrs['image_path'] = null;
        }

        return $attrs;
    }

    /**
     * What guests see right now in each placement: live campaigns in priority order. Those beyond the
     * placement's capacity only appear when they tie with a shown one (they take turns), otherwise they wait.
     */
    protected function lineup(): array
    {
        $live = AdCampaign::query()->live()->with('restaurant:id,name')->orderByDesc('priority')->orderBy('starts_at')->get()->groupBy('slot');

        return collect(AdCampaign::CAPACITY)->map(function (?int $capacity, string $slot) use ($live) {
            $ads = $live->get($slot, collect())->values();
            $cutoff = $capacity !== null && $ads->count() > $capacity ? $ads[$capacity - 1]->priority : null;

            return [
                'slot' => $slot,
                'capacity' => $capacity,
                'ads' => $ads->map(fn (AdCampaign $ad, int $i) => [
                    'id' => $ad->id,
                    'title' => $ad->translate('title', 'en'),
                    'advertiser' => $ad->advertiser(),
                    'priority' => $ad->priority,
                    'city' => $ad->city,
                    'state' => match (true) {
                        $capacity === null => 'shown',
                        $cutoff !== null && $ad->priority === $cutoff => 'rotating',
                        $i < $capacity => 'shown',
                        default => 'waiting',
                    },
                ]),
            ];
        })->values()->all();
    }

    /** Optionally invoices the campaign in Finance (type "advertising"). */
    protected function recordPayment(AdCampaign $ad, array $data, Request $request): void
    {
        if (empty($data['record_payment']) || (float) $data['price'] <= 0) {
            return;
        }

        $status = $data['payment_status'] ?? 'pending';
        $payment = Payment::create([
            'restaurant_id' => $ad->restaurant_id,
            'invoice_number' => Payment::nextInvoiceNumber(),
            'type' => 'advertising',
            'payer_name' => $ad->restaurant_id ? null : $ad->advertiser_name,
            'description' => AdCampaign::SLOTS[$ad->slot].': '.$ad->translate('title').' ('.$ad->starts_at->toDateString().' – '.$ad->ends_at->toDateString().')',
            'amount' => $ad->price,
            'currency' => $ad->currency,
            'status' => $status,
            // 7 days to pay (or by the start date if later) — never overdue on the day it's issued.
            'due_date' => $ad->starts_at->max(now()->addDays(7))->toDateString(),
            'paid_at' => $status === 'paid' ? now() : null,
            'recorded_by' => $request->user()->id,
        ]);
        $ad->update(['payment_id' => $payment->id]);
    }
}
