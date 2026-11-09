<?php

namespace App\Models;

use App\Enums\RestaurantRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property bool $is_super_admin
 * @property string $locale
 * @property int|null $current_restaurant_id
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'locale', 'current_restaurant_id'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_super_admin' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function restaurants(): BelongsToMany
    {
        return $this->belongsToMany(Restaurant::class)->withPivot('role')->withTimestamps();
    }

    public function currentRestaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class, 'current_restaurant_id');
    }

    public function isSuperAdmin(): bool
    {
        return (bool) $this->is_super_admin;
    }

    public function roleIn(Restaurant $restaurant): ?RestaurantRole
    {
        $membership = $this->restaurants()->whereKey($restaurant->id)->first();

        return $membership ? RestaurantRole::from($membership->pivot->role) : null;
    }

    /** The restaurant the user is working on: their selected one, or their first membership. */
    public function activeRestaurant(): ?Restaurant
    {
        if ($this->current_restaurant_id) {
            $restaurant = $this->restaurants()->whereKey($this->current_restaurant_id)->first();
            if ($restaurant) {
                return $restaurant;
            }
        }

        return $this->restaurants()->orderBy('restaurants.id')->first();
    }
}
