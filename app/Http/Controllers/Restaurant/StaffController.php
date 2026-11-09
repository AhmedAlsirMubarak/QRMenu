<?php

namespace App\Http\Controllers\Restaurant;

use App\Enums\RestaurantRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\StaffInvitation;
use App\Services\PlanLimits;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Team members of the current restaurant (owners only). */
class StaffController extends Controller
{
    /** Members allowed (owner included) when the plan doesn't include "staff_roles". */
    public const BASIC_TEAM_SIZE = 2;

    public function index(Request $request, CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-staff');
        $restaurant = $current->get();
        $members = $restaurant->users()->orderBy('restaurant_user.created_at')->get();
        // An invitee's set-password token stays until they choose a password, i.e. accept the invitation.
        $invited = DB::table('password_reset_tokens')->whereIn('email', $members->pluck('email'))->pluck('email')->flip();

        return Inertia::render('restaurant/staff', [
            'members' => $members->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->pivot->role,
                'joined_at' => $u->pivot->created_at?->toDateString(),
                'is_me' => $u->id === $request->user()->id,
                'invited' => $invited->has($u->email),
            ]),
            'roles' => collect(RestaurantRole::cases())->map(fn ($r) => ['value' => $r->value, 'label' => $r->label()]),
            'teamLimit' => $this->teamLimit($current),
        ]);
    }

    public function store(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-staff');
        $restaurant = $current->get();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'role' => ['required', Rule::enum(RestaurantRole::class)],
        ]);
        $email = Str::lower($data['email']);

        $limit = $this->teamLimit($current);
        if ($limit !== null && $restaurant->users()->count() >= $limit) {
            $this->toast('Your plan includes '.$limit.' team members. Upgrade to Business for unlimited staff and roles.', 'error');

            return back();
        }

        if ($restaurant->users()->where('email', $email)->exists()) {
            return back()->withErrors(['email' => 'This person is already on your team.']);
        }

        $token = null;
        $user = User::where('email', $email)->first();

        DB::transaction(function () use (&$user, &$token, $data, $email, $restaurant) {
            if (! $user) {
                // New account: random password; the invitation e-mail lets them choose their own.
                $user = User::create(['name' => $data['name'], 'email' => $email, 'password' => Str::password(32)]);
                $user->forceFill(['email_verified_at' => now()])->save();
                $token = Password::broker()->createToken($user);
            }

            $restaurant->users()->attach($user->id, ['role' => $data['role']]);

            if (! $user->current_restaurant_id) {
                $user->forceFill(['current_restaurant_id' => $restaurant->id])->save();
            }
        });

        // Send after the response so the page doesn't wait for the mail server.
        $inviter = $request->user()->name;
        defer(fn () => $user->notify(new StaffInvitation($restaurant, $data['role'], $inviter, $token)));
        $this->toast("Invitation sent to {$email}.", 'success');

        return back();
    }

    public function update(Request $request, CurrentRestaurant $current, User $user): RedirectResponse
    {
        Gate::authorize('manage-staff');
        $restaurant = $current->get();
        $data = $request->validate(['role' => ['required', Rule::enum(RestaurantRole::class)]]);

        $role = $user->roleIn($restaurant);
        abort_if($role === null, 404);

        if ($role === RestaurantRole::Owner && $data['role'] !== 'owner' && $this->ownerCount($current) === 1) {
            $this->toast('Every restaurant needs at least one owner.', 'error');

            return back();
        }

        $restaurant->users()->updateExistingPivot($user->id, ['role' => $data['role']]);
        $this->toast("{$user->name} is now ".ucfirst($data['role']).'.');

        return back();
    }

    public function destroy(Request $request, CurrentRestaurant $current, User $user): RedirectResponse
    {
        Gate::authorize('manage-staff');
        $restaurant = $current->get();

        $role = $user->roleIn($restaurant);
        abort_if($role === null, 404);

        if ($user->id === $request->user()->id) {
            $this->toast('You can’t remove yourself. Ask another owner to do it.', 'error');

            return back();
        }

        if ($role === RestaurantRole::Owner && $this->ownerCount($current) === 1) {
            $this->toast('Every restaurant needs at least one owner.', 'error');

            return back();
        }

        $restaurant->users()->detach($user->id);
        if ($user->current_restaurant_id === $restaurant->id) {
            $user->forceFill(['current_restaurant_id' => null])->save();
        }

        $this->toast("{$user->name} no longer has access.");

        return back();
    }

    protected function ownerCount(CurrentRestaurant $current): int
    {
        return $current->get()->users()->wherePivot('role', 'owner')->count();
    }

    protected function teamLimit(CurrentRestaurant $current): ?int
    {
        return PlanLimits::for($current->get())->has('staff_roles') ? null : self::BASIC_TEAM_SIZE;
    }
}
