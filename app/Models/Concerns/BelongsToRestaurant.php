<?php

namespace App\Models\Concerns;

use App\Models\Restaurant;
use App\Support\CurrentRestaurant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tenant isolation: when a current restaurant is set, every query on the model
 * is limited to that restaurant and new records are stamped with its id.
 * Super-admin code that must see all tenants uses ->withoutRestaurantScope().
 */
trait BelongsToRestaurant
{
    public static function bootBelongsToRestaurant(): void
    {
        static::addGlobalScope('restaurant', function (Builder $query) {
            $current = app(CurrentRestaurant::class);

            if ($current->check()) {
                $query->where($query->getModel()->getTable().'.restaurant_id', $current->id());
            }
        });

        static::creating(function ($model) {
            $current = app(CurrentRestaurant::class);

            if (empty($model->restaurant_id) && $current->check()) {
                $model->restaurant_id = $current->id();
            }
        });
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function scopeWithoutRestaurantScope(Builder $query): Builder
    {
        return $query->withoutGlobalScope('restaurant');
    }
}
