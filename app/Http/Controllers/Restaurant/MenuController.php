<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Services\PlanLimits;
use App\Support\CurrentRestaurant;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    public function index(CurrentRestaurant $current): Response
    {
        $restaurant = $current->get();

        return Inertia::render('restaurant/menu/index', [
            'categories' => MenuCategory::query()
                ->orderBy('sort_order')->orderBy('id')
                ->with(['items' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')->with('options')])
                ->get(),
            'menu' => [
                'name' => $restaurant->name,
                'main_language' => $restaurant->main_language,
                'languages' => $restaurant->languages,
                'currency' => $restaurant->currency,
                'theme' => $restaurant->theme,
                'logo_url' => $restaurant->logo_url,
                'cover_url' => $restaurant->cover_url,
                'slug' => $restaurant->slug,
            ],
            'options' => [
                'languages' => config('qrmenu.languages'),
                'currencies' => config('qrmenu.currencies'),
                'themes' => config('qrmenu.themes'),
                'dietary' => MenuItem::DIETARY_TAGS,
                'allergens' => MenuItem::ALLERGENS,
            ],
            'limits' => PlanLimits::for($restaurant)->toArray() + ['items_used' => MenuItem::count()],
            'can' => ['manage_restaurant' => request()->user()->can('manage-restaurant')],
        ]);
    }
}
