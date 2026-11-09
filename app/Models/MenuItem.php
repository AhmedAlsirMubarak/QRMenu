<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use App\Models\Concerns\HasTranslations;
use App\Models\Concerns\LogsActivity;
use App\Services\ImageStore;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MenuItem extends Model
{
    use BelongsToRestaurant, HasTranslations, LogsActivity, SoftDeletes;

    protected $appends = ['image_url'];

    /** Nothing can restore a deleted dish, so its photo goes too instead of staying online. */
    protected static function booted(): void
    {
        static::deleted(function (MenuItem $model) {
            if ($model->image_path) {
                ImageStore::delete($model->image_path);
                $model->forceFill(['image_path' => null])->saveQuietly();
            }
        });
    }

    public const DIETARY_TAGS = ['vegetarian', 'vegan', 'spicy', 'halal', 'gluten_free'];

    public const ALLERGENS = ['gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'soy', 'fish', 'shellfish', 'sesame'];

    protected array $translatable = ['name', 'description'];

    protected $fillable = [
        'restaurant_id', 'menu_category_id', 'sku', 'name', 'description', 'price', 'compare_at_price',
        'image_path', 'is_available', 'is_featured', 'dietary_tags', 'allergens', 'calories', 'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:3',
        'compare_at_price' => 'decimal:3',
        'is_available' => 'boolean',
        'is_featured' => 'boolean',
        'dietary_tags' => 'array',
        'allergens' => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class, 'menu_category_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(MenuItemOption::class)->orderBy('sort_order');
    }

    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn () => ImageStore::url($this->image_path));
    }
}
