<?php

namespace App\Http\Controllers\Restaurant;

use App\Actions\Restaurants\CreateRestaurant;
use App\Http\Controllers\Controller;
use App\Services\ImageStore;
use App\Services\PlanLimits;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-restaurant');
        $restaurant = $current->get();

        return Inertia::render('restaurant/profile', [
            'profile' => $restaurant->only([
                'name', 'slug', 'tagline', 'phone', 'email', 'instagram_handle', 'google_review_url',
                'google_rating', 'google_review_count', 'main_language', 'languages', 'currency', 'theme',
                'logo_url', 'cover_url',
            ]),
            'options' => [
                'languages' => config('qrmenu.languages'),
                'currencies' => config('qrmenu.currencies'),
                'themes' => config('qrmenu.themes'),
            ],
            'limits' => PlanLimits::for($restaurant)->toArray(),
            'menuBaseUrl' => url('/'),
            'marketplace' => [
                'listed' => (bool) $restaurant->marketplace_listed,
                'venue_type' => $restaurant->venue_type,
                'cuisines' => $restaurant->cuisines ?? [],
                'types' => \App\Models\Restaurant::VENUE_TYPES,
                'has_location' => $restaurant->branches()->whereNotNull('latitude')->exists(),
            ],
        ]);
    }

    public function update(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-restaurant');
        $restaurant = $current->get();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'alpha_dash', 'max:60', Rule::notIn(CreateRestaurant::RESERVED), Rule::unique('restaurants', 'slug')->ignore($restaurant->id)],
            'tagline' => ['nullable', 'array'],
            'tagline.*' => ['nullable', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'instagram_handle' => ['nullable', 'string', 'max:60', 'regex:/^@?[A-Za-z0-9._]+$/'],
            'google_review_url' => ['nullable', 'url', 'max:500'],
            'google_rating' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'google_review_count' => ['nullable', 'integer', 'min:0'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'cover' => ['nullable', 'image', 'max:5120'],
            'remove_logo' => ['boolean'],
            'remove_cover' => ['boolean'],
        ], [
            'slug.not_in' => 'That web address is reserved by QRMenu. Please choose another.',
            'slug.unique' => 'Another restaurant already uses that web address.',
        ], ['slug' => 'web address', 'google_review_url' => 'Google review link', 'google_rating' => 'Google rating', 'google_review_count' => 'Google review count', 'instagram_handle' => 'Instagram handle']);

        $data['instagram_handle'] = isset($data['instagram_handle']) ? ltrim($data['instagram_handle'], '@') : null;
        $data['tagline'] = collect($data['tagline'] ?? [])->only($restaurant->languages)->filter()->all() ?: null;

        foreach (['logo' => 'logo_path', 'cover' => 'cover_path'] as $input => $column) {
            if ($request->hasFile($input)) {
                $data[$column] = ImageStore::put($request->file($input), $restaurant->id, 'brand', $restaurant->{$column});
            } elseif ($request->boolean("remove_{$input}")) {
                ImageStore::delete($restaurant->{$column});
                $data[$column] = null;
            }
            unset($data[$input], $data["remove_{$input}"]);
        }

        $restaurant->update($data);
        $this->toast('Restaurant profile saved.');

        return back();
    }

    /** Opt in/out of the public Marketplace directory. */
    public function updateMarketplace(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-restaurant');

        $data = $request->validate([
            'marketplace_listed' => ['required', 'boolean'],
            'venue_type' => ['required', Rule::in(array_keys(\App\Models\Restaurant::VENUE_TYPES))],
            'cuisines' => ['array', 'max:6'],
            'cuisines.*' => ['string', 'max:30'],
        ]);
        $data['cuisines'] = collect($data['cuisines'] ?? [])->map(fn ($c) => trim($c))->filter()->unique()->values()->all();

        $current->get()->update($data);
        $this->toast($data['marketplace_listed'] ? 'Your restaurant is listed on the Marketplace.' : 'Your restaurant is hidden from the Marketplace.');

        return back();
    }

    /** Language / currency / theme strip at the top of the menu builder. */
    public function updateMenuSettings(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-restaurant');
        $restaurant = $current->get();
        $languageKeys = array_keys(config('qrmenu.languages'));

        $data = $request->validate([
            'main_language' => ['required', Rule::in($languageKeys)],
            'languages' => ['array'],
            'languages.*' => [Rule::in($languageKeys)],
            'currency' => ['required', Rule::in(array_keys(config('qrmenu.currencies')))],
            'theme' => ['required', Rule::in(array_keys(config('qrmenu.themes')))],
        ]);

        $languages = array_values(array_unique(array_merge([$data['main_language']], $data['languages'] ?? [])));
        $max = PlanLimits::for($restaurant)->maxLanguages();

        if ($max !== null && count($languages) > $max) {
            return back()->withErrors(['languages' => "Your plan allows {$max} language(s). Upgrade to add more."]);
        }

        // Translations for removed languages stay in the database, so re-adding a language restores them.
        $restaurant->update(['languages' => $languages] + $data);
        $this->toast('Menu settings saved.');

        return back();
    }
}
