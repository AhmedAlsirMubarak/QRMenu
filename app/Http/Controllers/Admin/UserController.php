<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

/** Every account on the platform: restaurant staff and super admins. */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $type = $request->string('type')->toString();

        $users = User::query()
            ->when($request->string('search')->toString(), fn ($q, $s) => $q->where(fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->when($type === 'admins', fn ($q) => $q->where('is_super_admin', true))
            ->when($type === 'no-restaurant', fn ($q) => $q->where('is_super_admin', false)->doesntHave('restaurants'))
            ->when($type === 'unverified', fn ($q) => $q->whereNull('email_verified_at'))
            ->with(['restaurants' => fn ($q) => $q->withTrashed()->select('restaurants.id', 'restaurants.name', 'restaurants.slug')])
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_super_admin' => (bool) $u->is_super_admin,
                'verified' => $u->email_verified_at !== null,
                'two_factor' => $u->two_factor_confirmed_at !== null,
                'created_at' => $u->created_at?->toDateString(),
                'restaurants' => $u->restaurants->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'role' => $r->pivot->role]),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => $request->only('search', 'type'),
            'counts' => [
                'all' => User::count(),
                'admins' => User::where('is_super_admin', true)->count(),
                'no_restaurant' => User::where('is_super_admin', false)->doesntHave('restaurants')->count(),
            ],
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate(['is_super_admin' => ['sometimes', 'boolean'], 'verify' => ['sometimes', 'accepted']]);

        if (array_key_exists('is_super_admin', $data)) {
            if ($user->is($request->user())) {
                $this->toast('You can’t change your own super admin access.', 'error');

                return back();
            }
            $user->forceFill(['is_super_admin' => $data['is_super_admin']])->save();
            $this->toast($data['is_super_admin'] ? "{$user->name} is now a super admin." : "{$user->name} is no longer a super admin.");
        }

        if (! empty($data['verify']) && ! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
            $this->toast("{$user->email} marked as verified.");
        }

        return back();
    }

    public function sendReset(User $user): RedirectResponse
    {
        $status = Password::sendResetLink(['email' => $user->email]);
        $this->toast($status === Password::RESET_LINK_SENT ? "Password reset link sent to {$user->email}." : __($status), $status === Password::RESET_LINK_SENT ? 'success' : 'error');

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            $this->toast('You can’t delete your own account here.', 'error');

            return back();
        }

        // Don't orphan a restaurant: block if this user is its only owner.
        $soleOwnerOf = $user->restaurants()->wherePivot('role', 'owner')->get()
            ->filter(fn ($r) => DB::table('restaurant_user')->where('restaurant_id', $r->id)->where('role', 'owner')->count() === 1);

        if ($soleOwnerOf->isNotEmpty()) {
            $this->toast("{$user->name} is the only owner of {$soleOwnerOf->pluck('name')->join(', ')}. Add another owner first.", 'error');

            return back();
        }

        $user->restaurants()->detach();
        $user->delete();
        $this->toast('Account deleted.');

        return back();
    }
}
