<?php

namespace App\Models;

use App\Enums\RestaurantRole;
use App\Models\Concerns\HasTranslations;
use App\Services\ImageStore;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Restaurant extends Model
{
    use HasTranslations, SoftDeletes;

    public const VENUE_TYPES = ['restaurant' => 'Restaurant', 'cafe' => 'Café', 'bakery' => 'Bakery', 'dessert' => 'Desserts', 'juice' => 'Juice bar', 'lounge' => 'Lounge'];

    protected $appends = ['logo_url', 'cover_url'];

    protected array $translatable = ['tagline'];

    protected $fillable = [
        'name', 'slug', 'tagline', 'logo_path', 'cover_path', 'main_language', 'languages',
        'currency', 'theme', 'phone', 'email', 'instagram_handle', 'google_review_url',
        'google_rating', 'google_review_count', 'settings', 'status', 'is_showcased', 'showcase_order', 'marketplace_listed', 'venue_type', 'cuisines',
    ];

    protected $casts = [
        'languages' => 'array',
        'settings' => 'array',
        'google_rating' => 'decimal:1',
        'is_showcased' => 'boolean',
        'marketplace_listed' => 'boolean',
        'cuisines' => 'array',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role')->withTimestamps();
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(MenuCategory::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function roleOf(User $user): ?RestaurantRole
    {
        $role = $this->users()->whereKey($user->id)->first()?->pivot?->role;

        return $role ? RestaurantRole::from($role) : null;
    }

    public function setting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings, $key, $default);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    protected function logoUrl(): Attribute
    {
        return Attribute::get(fn () => ImageStore::url($this->logo_path));
    }

    protected function coverUrl(): Attribute
    {
        return Attribute::get(fn () => ImageStore::url($this->cover_path));
    }
}
