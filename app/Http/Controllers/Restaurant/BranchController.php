<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\QrCode;
use App\Services\PlanLimits;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BranchController extends Controller
{
    public function index(CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-branches');

        return Inertia::render('restaurant/branches', [
            'branches' => Branch::query()->withCount('qrCodes')->orderBy('id')->get(),
            'limits' => PlanLimits::for($current->get())->toArray(),
            'canAdd' => PlanLimits::for($current->get())->canAddBranch(),
        ]);
    }

    public function store(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-branches');

        if (! PlanLimits::for($current->get())->canAddBranch()) {
            $this->toast('Your plan’s branch limit is reached. Upgrade to Business for more branches.', 'error');

            return back();
        }

        $data = $this->validated($request);

        DB::transaction(function () use ($data) {
            $branch = Branch::create($data + ['slug' => $this->uniqueSlug($data['name'])]);
            QrCode::create(['branch_id' => $branch->id]);
        });

        $this->toast('Branch added with its own QR code.');

        return back();
    }

    public function update(Request $request, Branch $branch): RedirectResponse
    {
        Gate::authorize('manage-branches');
        $branch->update($this->validated($request));
        $this->toast('Branch saved.');

        return back();
    }

    public function destroy(Branch $branch): RedirectResponse
    {
        Gate::authorize('manage-branches');

        if (Branch::count() <= 1) {
            $this->toast('A restaurant needs at least one branch.', 'error');

            return back();
        }

        $branch->delete();
        $this->toast('Branch removed.');

        return back();
    }

    protected function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'area' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:200'],
            'phone' => ['nullable', 'string', 'max:30'],
            'wifi_name' => ['nullable', 'string', 'max:60'],
            'wifi_password' => ['nullable', 'string', 'max:60'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'google_review_url' => ['nullable', 'url', 'max:500'],
            'is_active' => ['boolean'],
        ], [], ['google_review_url' => 'Google review link', 'wifi_name' => 'Wi-Fi name', 'wifi_password' => 'Wi-Fi password']);

        // Guests see these on the menu: "seeb" → "Seeb" (Arabic is unaffected).
        foreach (['city', 'area'] as $field) {
            if (! empty($data[$field])) {
                $data[$field] = Str::ucfirst(trim($data[$field]));
            }
        }

        return $data;
    }

    protected function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'branch';
        $slug = $base;
        $i = 2;

        while (Branch::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
