<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Restaurant\CategoryRequest;
use App\Models\MenuCategory;
use App\Services\ImageStore;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class CategoryController extends Controller
{
    public function store(CategoryRequest $request, CurrentRestaurant $current): RedirectResponse
    {
        $category = MenuCategory::create($request->payload() + [
            'sort_order' => (int) MenuCategory::max('sort_order') + 1,
        ]);

        if ($request->hasFile('image')) {
            $category->update(['image_path' => ImageStore::put($request->file('image'), $current->id(), 'categories')]);
        }

        $this->toast('Category added.');

        return redirect()->route('restaurant.menu.index', ['category' => $category->id]);
    }

    public function update(CategoryRequest $request, MenuCategory $category, CurrentRestaurant $current): RedirectResponse
    {
        $data = $request->payload();

        if ($request->hasFile('image')) {
            $data['image_path'] = ImageStore::put($request->file('image'), $current->id(), 'categories', $category->image_path);
        } elseif ($request->boolean('remove_image')) {
            ImageStore::delete($category->image_path);
            $data['image_path'] = null;
        }

        $category->update($data);
        $this->toast('Category saved.');

        return back();
    }

    public function destroy(MenuCategory $category): RedirectResponse
    {
        Gate::authorize('manage-menu');

        DB::transaction(function () use ($category) {
            $category->items()->get()->each->delete();   // soft delete, recoverable
            $category->delete();
        });

        $this->toast('Category and its dishes were removed.');

        return redirect()->route('restaurant.menu.index');
    }

    public function reorder(Request $request): RedirectResponse
    {
        Gate::authorize('manage-menu');
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        DB::transaction(function () use ($ids) {
            // whereKey runs through the tenant scope, so foreign ids are silently ignored.
            foreach ($ids as $position => $id) {
                MenuCategory::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        return back();
    }
}
