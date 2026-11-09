<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdCampaign;
use App\Models\Restaurant;
use App\Models\User;
use App\Services\ImageStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RestaurantController extends Controller
{
    public function index(Request $request): Response
    {
        $deleted = $request->query('status') === 'deleted';

        $restaurants = Restaurant::query()
            ->when($deleted, fn ($q) => $q->onlyTrashed())
            ->when($request->string('search')->toString(), fn ($q, $s) => $q->where(fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('slug', 'like', "%{$s}%")))
            ->when(! $deleted && $request->string('status')->toString(), fn ($q) => $q->where('status', $request->query('status')))
            ->with(['subscription.plan:id,name', 'users' => fn ($q) => $q->wherePivot('role', 'owner')->select('users.id', 'users.name', 'users.email')])
            ->withCount(['branches', 'items'])
            ->when($deleted, fn ($q) => $q->latest('deleted_at'), fn ($q) => $q->latest())
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/restaurants/index', [
            'restaurants' => $restaurants,
            'filters' => $request->only('search', 'status'),
            'deletedCount' => Restaurant::onlyTrashed()->count(),
        ]);
    }

    public function update(Request $request, Restaurant $restaurant): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['active', 'suspended'])],
            'is_showcased' => ['sometimes', 'boolean'],
        ]);
        $restaurant->update($data);

        if (array_key_exists('is_showcased', $data)) {
            $this->toast($data['is_showcased'] ? "{$restaurant->name} is now shown on the website." : "{$restaurant->name} was removed from the website.");

            return back();
        }

        $data['status'] ??= $restaurant->status;

        $this->toast($data['status'] === 'active' ? 'Restaurant activated.' : 'Restaurant suspended.', 'success');

        return back();
    }

    /**
     * Moves a restaurant to "Deleted": its menu, QR codes and dashboard stop working straight away,
     * its ads are paused, and nothing is erased yet — it can be restored or deleted forever later.
     */
    public function destroy(Request $request, Restaurant $restaurant): RedirectResponse
    {
        $request->validate(['confirm_name' => ['required', 'string']]);
        if (trim($request->input('confirm_name')) !== $restaurant->name) {
            return back()->withErrors(['confirm_name' => 'Type the restaurant name exactly to confirm.']);
        }

        DB::transaction(function () use ($restaurant) {
            AdCampaign::where('restaurant_id', $restaurant->id)->update(['is_paused' => true]);
            User::where('current_restaurant_id', $restaurant->id)->update(['current_restaurant_id' => null]);
            $restaurant->update(['is_showcased' => false, 'marketplace_listed' => false]);
            $restaurant->delete();
        });

        $this->toast("{$restaurant->name} was deleted. You can restore it from the “Deleted” filter.");

        return back();
    }

    public function restore(Restaurant $restaurant): RedirectResponse
    {
        $restaurant->restore();
        $this->toast("{$restaurant->name} was restored. Its ads stay paused until you resume them.", 'success');

        return back();
    }

    /** Erases a deleted restaurant and everything in it (menu, photos, QR codes, feedback, stats). Invoices are kept. */
    public function forceDestroy(Request $request, Restaurant $restaurant): RedirectResponse
    {
        abort_unless($restaurant->trashed(), 404);
        $request->validate(['confirm_name' => ['required', 'string']]);
        if (trim($request->input('confirm_name')) !== $restaurant->name) {
            return back()->withErrors(['confirm_name' => 'Type the restaurant name exactly to confirm.']);
        }

        $name = $restaurant->name;
        app(\App\Actions\Restaurants\DeleteRestaurant::class)->handle($restaurant);

        $this->toast("{$name} was permanently deleted.");

        return back();
    }
}
