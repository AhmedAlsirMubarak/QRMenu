<?php

namespace App\Services\PublicMenu;

use App\Models\Branch;
use App\Models\MenuCategory;
use App\Models\PlateStory;
use App\Services\PlateStorySettings;
use App\Models\QrCode;
use App\Models\Restaurant;
use App\Services\ImageStore;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Shapes a restaurant's live menu for the guest page (only visible categories, branch overrides applied). */
class MenuPresenter
{
    public function __construct(protected Restaurant $restaurant, protected Branch $branch, protected ?QrCode $qr = null) {}

    public function toArray(): array
    {
        $r = $this->restaurant;
        $languages = collect($r->languages)->mapWithKeys(fn ($code) => [$code => config("qrmenu.languages.{$code}") ?? ['name' => $code, 'native' => $code, 'dir' => 'ltr']]);
        $currency = config("qrmenu.currencies.{$r->currency}") ?? ['symbol' => $r->currency, 'symbol_ar' => $r->currency, 'decimals' => 2];

        return [
            'restaurant' => [
                'name' => $r->name,
                'slug' => $r->slug,
                'tagline' => $r->tagline,
                'logo_url' => $r->logo_url,
                'cover_url' => $r->cover_url,
                'theme' => $r->theme,
                'main_language' => $r->main_language,
                'languages' => $languages,
                'currency' => ['code' => $r->currency] + $currency,
                'phone' => $r->phone,
                'instagram' => $r->instagram_handle,
                'google' => [
                    'rating' => $r->google_rating ? (float) $r->google_rating : null,
                    'count' => $r->google_review_count,
                    'url' => $this->branch->google_review_url ?: $r->google_review_url,
                ],
                'plate_story' => $this->plateStory(),
            ],
            'branch' => [
                'id' => $this->branch->id,
                'name' => $this->branch->name,
                'slug' => $this->branch->slug,
                'city' => $this->branch->city,
                'area' => $this->branch->area,
                'address' => $this->branch->address,
                'phone' => $this->branch->phone,
                'wifi_name' => $this->branch->wifi_name,
                'wifi_password' => $this->branch->wifi_password,
                'map_url' => $this->mapUrl(),
            ],
            'branches' => Branch::where('restaurant_id', $r->id)->where('is_active', true)->orderBy('id')->get(['id', 'name', 'slug', 'area', 'city']),
            'table' => $this->qr?->table_label,
            'qr' => $this->qr?->code,
            'categories' => $this->categories(),
        ];
    }

    protected function categories(): array
    {
        $now = Carbon::now(config('qrmenu.timezone'))->format('H:i:s');

        $overrides = DB::table('branch_menu_item')->where('branch_id', $this->branch->id)->get()->keyBy('menu_item_id');

        // Approved guest photos (Plate Story), newest first, up to 6 per dish.
        $guestPhotos = PlateStory::where('restaurant_id', $this->restaurant->id)
            ->where('status', 'approved')->whereNotNull('menu_item_id')->whereNotNull('before_path')
            ->latest()->limit(300)->get(['menu_item_id', 'before_path'])
            ->groupBy('menu_item_id')
            ->map(fn ($rows) => $rows->take(6)->map(fn ($r) => ImageStore::url($r->before_path))->values());

        return MenuCategory::query()
            ->where('restaurant_id', $this->restaurant->id)
            ->where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')
            ->with(['items' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')->with('options')])
            ->get()
            ->filter(fn (MenuCategory $c) => $this->isOpen($c->available_from, $c->available_until, $now))
            ->map(fn (MenuCategory $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'description' => $c->description,
                'image_url' => $c->image_url,
                'items' => $c->items->map(function ($item) use ($overrides, $guestPhotos) {
                    $override = $overrides->get($item->id);

                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'description' => $item->description,
                        'price' => $override?->price ?? $item->price,
                        'compare_at_price' => $item->compare_at_price,
                        'image_url' => ImageStore::url($item->image_path),
                        'is_available' => $item->is_available && ($override ? (bool) $override->is_available : true),
                        'is_featured' => $item->is_featured,
                        'dietary_tags' => $item->dietary_tags ?? [],
                        'allergens' => $item->allergens ?? [],
                        'calories' => $item->calories,
                        'options' => $item->options->map->only(['id', 'type', 'name', 'price'])->values(),
                        'guest_photos' => $guestPhotos->get($item->id, collect())->all(),
                    ];
                })->values(),
            ])
            ->filter(fn ($c) => count($c['items']) > 0)
            ->values()
            ->all();
    }

    protected function plateStory(): ?array
    {
        if (! PlateStorySettings::available($this->restaurant)) {
            return null;
        }
        $s = PlateStorySettings::for($this->restaurant);

        return [
            'ask_after_photo' => $s['ask_after_photo'],
            'card_styles' => $s['card_styles'],
            'caption' => $s['caption'],
            'reward' => $s['reward_enabled'] ? $s['reward_text'] : null,
        ];
    }

    protected function isOpen(?string $from, ?string $until, string $now): bool
    {
        if (! $from || ! $until) {
            return true;
        }

        // Supports windows that cross midnight (e.g. 22:00–02:00 suhoor menus).
        return $from <= $until ? ($now >= $from && $now <= $until) : ($now >= $from || $now <= $until);
    }

    protected function mapUrl(): ?string
    {
        if ($this->branch->latitude && $this->branch->longitude) {
            return "https://www.google.com/maps/search/?api=1&query={$this->branch->latitude},{$this->branch->longitude}";
        }
        $address = trim(implode(', ', array_filter([$this->restaurant->name, $this->branch->address, $this->branch->area, $this->branch->city])));

        return $this->branch->address || $this->branch->area ? 'https://www.google.com/maps/search/?api=1&query='.urlencode($address) : null;
    }
}
