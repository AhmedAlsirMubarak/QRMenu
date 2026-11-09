<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Restaurant\ItemRequest;
use App\Models\MenuItem;
use App\Services\ImageStore;
use App\Services\PlanLimits;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    public function store(ItemRequest $request, CurrentRestaurant $current): RedirectResponse
    {
        if (! PlanLimits::for($current->get())->canAddItems()) {
            $this->toast('You’ve reached your plan’s dish limit. Upgrade to add more.', 'error');

            return back();
        }

        DB::transaction(function () use ($request, $current) {
            $data = $request->payload();
            $data['sort_order'] = (int) MenuItem::where('menu_category_id', $data['menu_category_id'])->max('sort_order') + 1;

            if ($request->hasFile('image')) {
                $data['image_path'] = ImageStore::put($request->file('image'), $current->id(), 'items');
            }

            $item = MenuItem::create($data);
            $item->options()->createMany($request->options());
        });

        $this->toast('Dish added.');

        return back();
    }

    public function update(ItemRequest $request, MenuItem $item, CurrentRestaurant $current): RedirectResponse
    {
        DB::transaction(function () use ($request, $item, $current) {
            $data = $request->payload();

            if ($request->hasFile('image')) {
                $data['image_path'] = ImageStore::put($request->file('image'), $current->id(), 'items', $item->image_path);
            } elseif ($request->boolean('remove_image')) {
                ImageStore::delete($item->image_path);
                $data['image_path'] = null;
            }

            if ($data['menu_category_id'] != $item->menu_category_id) {
                $data['sort_order'] = (int) MenuItem::where('menu_category_id', $data['menu_category_id'])->max('sort_order') + 1;
            }

            $item->update($data);
            $item->options()->delete();
            $item->options()->createMany($request->options());
        });

        $this->toast('Dish saved.');

        return back();
    }

    /** Quick switches from the items table: available / featured. */
    public function toggle(Request $request, MenuItem $item): RedirectResponse
    {
        Gate::authorize('manage-menu');
        $data = $request->validate([
            'field' => ['required', Rule::in(['is_available', 'is_featured'])],
            'value' => ['required', 'boolean'],
        ]);

        $item->update([$data['field'] => $data['value']]);

        return back();
    }

    public function duplicate(MenuItem $item, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-menu');

        if (! PlanLimits::for($current->get())->canAddItems()) {
            $this->toast('You’ve reached your plan’s dish limit.', 'error');

            return back();
        }

        DB::transaction(function () use ($item) {
            $copy = $item->replicate(['sku', 'image_path']);
            $copy->name = collect($item->name)->map(fn ($v, $lang) => $lang === 'ar' ? $v.' (نسخة)' : $v.' (copy)')->all();
            $copy->sort_order = $item->sort_order + 1;
            $copy->save();
            $copy->options()->createMany($item->options->map->only(['type', 'name', 'price', 'sort_order'])->all());
        });

        $this->toast('Dish duplicated.');

        return back();
    }

    public function destroy(MenuItem $item): RedirectResponse
    {
        Gate::authorize('manage-menu');
        $item->delete();
        $this->toast('Dish removed.');

        return back();
    }

    public function reorder(Request $request): RedirectResponse
    {
        Gate::authorize('manage-menu');
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        DB::transaction(function () use ($ids) {
            foreach ($ids as $position => $id) {
                MenuItem::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        return back();
    }
}
