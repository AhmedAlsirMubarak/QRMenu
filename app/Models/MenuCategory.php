<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use App\Models\Concerns\HasTranslations;
use App\Models\Concerns\LogsActivity;
use App\Services\ImageStore;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MenuCategory extends Model
{
    use BelongsToRestaurant, HasTranslations, LogsActivity, SoftDeletes;

    protected $appends = ['image_url'];

    /** Nothing can restore a deleted category, so its photo goes too instead of staying online. */
    protected static function booted(): void
    {
        static::deleted(function (MenuCategory $model) {
            if ($model->image_path) {
                ImageStore::delete($model->image_path);
                $model->forceFill(['image_path' => null])->saveQuietly();
            }
        });
    }

    protected array $translatable = ['name', 'description'];

    protected $fillable = [
        'restaurant_id', 'name', 'description', 'image_path', 'available_from', 'available_until',
        'sort_order', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class)->orderBy('sort_order');
    }

    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn () => ImageStore::url($this->image_path));
    }
}
