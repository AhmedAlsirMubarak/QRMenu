<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use BelongsToRestaurant, LogsActivity, SoftDeletes;

    protected $fillable = [
        'restaurant_id', 'name', 'slug', 'city', 'area', 'address', 'latitude', 'longitude',
        'phone', 'wifi_name', 'wifi_password', 'opening_hours', 'google_review_url', 'is_active',
    ];

    protected $casts = [
        'opening_hours' => 'array',
        'is_active' => 'boolean',
    ];

    public function qrCodes(): HasMany
    {
        return $this->hasMany(QrCode::class);
    }
}
