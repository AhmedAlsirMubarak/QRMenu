<?php

namespace App\Services\Marketplace;

use App\Models\AdCampaign;
use App\Models\CustomerFeedback;
use App\Models\Restaurant;
use Illuminate\Support\Collection;

/**
 * Builds the public Marketplace listing: restaurants that opted in, are active and have a live menu.
 * Ratings come from the platform's own guest feedback (a restaurant needs MIN_RATINGS to rank as "top rated").
 * Filtering/sorting runs in PHP — fine for hundreds of listings; move to SQL when the directory grows.
 */
class MarketplaceSearch
{
    public const MIN_RATINGS = 3;

    public const SORTS = ['top', 'nearest', 'newest'];

    /** @return Collection<int, array<string, mixed>> */
    public function listings(array $filters): Collection
    {
        $restaurants = Restaurant::query()
            ->where('marketplace_listed', true)->where('status', 'active')
            ->when($filters['type'] ?? null, fn ($q, $t) => $q->where('venue_type', $t))
            ->with(['subscription', 'branches' => fn ($q) => $q->withoutRestaurantScope()->where('is_active', true)->select('id', 'restaurant_id', 'name', 'city', 'area', 'latitude', 'longitude')])
            ->get()
            ->filter(fn (Restaurant $r) => $r->subscription?->isUsable());

        $ratings = CustomerFeedback::withoutRestaurantScope()
            ->whereIn('restaurant_id', $restaurants->pluck('id'))
            ->whereNotNull('overall_rating')
            ->selectRaw('restaurant_id, avg(overall_rating) as rating, count(*) as total')
            ->groupBy('restaurant_id')->get()->keyBy('restaurant_id');

        $offers = AdCampaign::query()->live($filters['city'] ?? null)->where('slot', 'offer')->whereNotNull('restaurant_id')
            ->ranked()->get()->unique('restaurant_id')->keyBy('restaurant_id'); // one offer per card: the highest priority

        $q = mb_strtolower(trim((string) ($filters['q'] ?? '')));
        $city = $filters['city'] ?? null;
        $lat = isset($filters['lat']) ? (float) $filters['lat'] : null;
        $lng = isset($filters['lng']) ? (float) $filters['lng'] : null;

        $rows = $restaurants->map(function (Restaurant $r) use ($ratings, $offers, $lat, $lng, $city) {
            $branches = $city ? $r->branches->where('city', $city) : $r->branches;
            $distance = null;
            if ($lat !== null && $lng !== null) {
                $distance = $branches->filter(fn ($b) => $b->latitude !== null && $b->longitude !== null)
                    ->map(fn ($b) => self::km($lat, $lng, (float) $b->latitude, (float) $b->longitude))->min();
            }
            $rating = $ratings->get($r->id);
            $offer = $offers->get($r->id);

            return [
                'id' => $r->id,
                'name' => $r->name,
                'slug' => $r->slug,
                'tagline' => $r->tagline,
                'logo_url' => $r->logo_url,
                'venue_type' => $r->venue_type,
                'cuisines' => $r->cuisines ?? [],
                'cities' => $r->branches->pluck('city')->filter()->unique()->values(),
                'area' => $branches->first()?->area,
                'branches' => $r->branches->count(),
                'languages' => $r->languages,
                'rating' => $rating && $rating->total >= self::MIN_RATINGS ? round((float) $rating->rating, 1) : null,
                'rating_count' => (int) ($rating->total ?? 0),
                'google_rating' => $r->google_rating ? (float) $r->google_rating : null,
                'distance_km' => $distance !== null ? round($distance, 1) : null,
                'offer' => $offer ? ['id' => $offer->id, 'title' => $offer->title, 'subtitle' => $offer->subtitle] : null,
                // An offer campaign with its own artwork replaces the card photo while it runs.
                'cover_url' => $offer?->image_url ?? $r->cover_url,
                'created_at' => $r->created_at?->timestamp,
                '_search' => mb_strtolower(implode(' ', [$r->name, $r->translate('tagline') ?? '', implode(' ', $r->cuisines ?? []), $r->branches->pluck('area')->join(' '), $r->branches->pluck('city')->join(' ')])),
                '_in_city' => ! $city || $branches->isNotEmpty(),
            ];
        })
            ->filter(fn ($row) => $row['_in_city'])
            ->filter(fn ($row) => $q === '' || str_contains($row['_search'], $q));

        $rows = match ($filters['sort'] ?? 'top') {
            'newest' => $rows->sortByDesc('created_at'),
            'nearest' => $rows->sortBy(fn ($r) => $r['distance_km'] ?? PHP_INT_MAX),
            default => $rows->sortBy([
                fn ($a, $b) => ($b['rating'] ?? 0) <=> ($a['rating'] ?? 0),
                fn ($a, $b) => $b['rating_count'] <=> $a['rating_count'],
                fn ($a, $b) => ($b['google_rating'] ?? 0) <=> ($a['google_rating'] ?? 0),
            ]),
        };

        return $rows->map(fn ($row) => collect($row)->except(['_search', '_in_city'])->all())->values();
    }

    /** Cities that have at least one listed restaurant (for the filter). */
    public function cities(): Collection
    {
        return \App\Models\Branch::withoutRestaurantScope()
            ->whereHas('restaurant', fn ($q) => $q->where('marketplace_listed', true)->where('status', 'active'))
            ->where('is_active', true)->whereNotNull('city')
            ->distinct()->orderBy('city')->pluck('city');
    }

    public static function km(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
