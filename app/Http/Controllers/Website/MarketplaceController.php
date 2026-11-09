<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\AdCampaign;
use App\Models\Restaurant;
use App\Models\SiteSetting;
use App\Services\Marketplace\MarketplaceSearch;
use App\Services\PublicMenu\VisitTracker;
use App\Services\Website\WebsiteContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public const PER_PAGE = 18;

    public const SPONSORED_SLOTS = AdCampaign::CAPACITY['sponsored'];

    public function index(Request $request, MarketplaceSearch $search): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'type' => ['nullable', Rule::in(array_keys(Restaurant::VENUE_TYPES))],
            'sort' => ['nullable', Rule::in(MarketplaceSearch::SORTS)],
            'lat' => ['nullable', 'numeric', 'between:-90,90', 'required_with:lng'],
            'lng' => ['nullable', 'numeric', 'between:-180,180', 'required_with:lat'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $filters['sort'] ??= 'top';
        if ($filters['sort'] === 'nearest' && ! isset($filters['lat'])) {
            $filters['sort'] = 'top';
        }

        $all = $search->listings($filters);
        $city = $filters['city'] ?? null;

        // Sponsored restaurants are pinned on top of the first page (only when they match the current filters).
        $sponsoredAds = AdCampaign::query()->live($city)->where('slot', 'sponsored')->whereNotNull('restaurant_id')->ranked()->get()
            ->unique('restaurant_id');
        $sponsored = $sponsoredAds->map(fn (AdCampaign $ad) => ($row = $all->firstWhere('id', $ad->restaurant_id))
            // The campaign's own artwork (if uploaded) replaces the restaurant's cover photo.
            ? array_merge($row, ['ad_id' => $ad->id, 'cover_url' => $ad->image_url ?? $row['cover_url']])
            : null)
            ->filter()->take(self::SPONSORED_SLOTS)->values();
        $organic = $all->reject(fn ($r) => $sponsored->contains('id', $r['id']))->values();

        $page = (int) ($filters['page'] ?? 1);
        $paginator = new LengthAwarePaginator($organic->forPage($page, self::PER_PAGE)->values(), $organic->count(), self::PER_PAGE, $page, [
            'path' => $request->url(),
            'query' => $request->except('page'),
        ]);

        $banner = AdCampaign::query()->live($city)->where('slot', 'banner')->ranked()->with('restaurant:id,name,slug,logo_path,cover_path')->first();
        $sidebar = AdCampaign::query()->live($city)->where('slot', 'sidebar')->ranked()->with('restaurant:id,name,slug,logo_path,cover_path')->limit(AdCampaign::CAPACITY['sidebar'])->get();

        $shown = collect([$banner])->filter()->merge($sidebar)->pluck('id')
            ->merge($page === 1 ? $sponsored->pluck('ad_id') : [])
            ->merge($paginator->getCollection()->pluck('offer.id')->filter());
        $this->countImpressions($request, $shown->all());

        return Inertia::render('website/marketplace', [
            'page' => WebsiteContent::page('marketplace'),
            'chrome' => WebsiteContent::chrome(),
            'filters' => collect($filters)->only(['q', 'city', 'type', 'sort'])->all() + ['near' => isset($filters['lat'])],
            'cities' => $search->cities(),
            'venueTypes' => Restaurant::VENUE_TYPES,
            'sponsored' => $page === 1 ? $sponsored : [],
            'listings' => $paginator,
            'banner' => $banner ? $this->ad($banner) : null,
            'sidebar' => $sidebar->map(fn ($ad) => $this->ad($ad)),
            'advertiseEmail' => SiteSetting::get('support_email'),
            'minRatings' => MarketplaceSearch::MIN_RATINGS,
        ]);
    }

    /** Ad clicks go through here so they can be counted, then on to the menu or advertiser. */
    public function click(Request $request, AdCampaign $ad): RedirectResponse
    {
        if ($ad->status !== 'live') {
            return redirect()->route('marketplace');
        }

        $key = "ads.clicked.{$ad->id}";
        if (! VisitTracker::isBot($request) && ! $request->session()->has($key)) {
            $ad->increment('clicks');
            $request->session()->put($key, true);
        }

        if ($ad->restaurant_id && $ad->restaurant) {
            return redirect()->to('/'.$ad->restaurant->slug.'?src=marketplace');
        }

        return $ad->link_url && preg_match('#^https?://#i', $ad->link_url)
            ? redirect()->away($ad->link_url)
            : redirect()->route('marketplace');
    }

    protected function ad(AdCampaign $ad): array
    {
        return [
            'id' => $ad->id,
            'title' => $ad->title,
            'subtitle' => $ad->subtitle,
            // No uploaded artwork → use the advertising restaurant's cover photo.
            'image_url' => $ad->image_url ?? $ad->restaurant?->cover_url,
            'logo_url' => $ad->restaurant?->logo_url,
            'advertiser' => $ad->advertiser(),
            'is_restaurant' => $ad->restaurant_id !== null,
            'href' => route('ads.click', $ad),
        ];
    }

    /** One impression per ad per visitor session per day; bots ignored. */
    protected function countImpressions(Request $request, array $ids): void
    {
        if (VisitTracker::isBot($request) || $ids === []) {
            return;
        }

        $seenKey = 'ads.seen.'.now()->toDateString();
        $seen = $request->session()->get($seenKey, []);
        $new = array_values(array_diff(array_unique($ids), $seen));

        if ($new !== []) {
            AdCampaign::whereIn('id', $new)->increment('impressions');
            $request->session()->put($seenKey, array_merge($seen, $new));
        }
    }
}
