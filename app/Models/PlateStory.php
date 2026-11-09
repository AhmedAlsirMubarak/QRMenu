<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlateStory extends Model
{
    use BelongsToRestaurant;

    protected $fillable = [
        'restaurant_id', 'branch_id', 'menu_item_id', 'before_path', 'after_path', 'card_path', 'photos_deleted_at',
        'card_style', 'status', 'shared_at', 'reward_code', 'reward_expires_at', 'reward_redeemed_at', 'session_hash',
    ];

    protected $casts = [
        'shared_at' => 'datetime',
        'photos_deleted_at' => 'datetime',
        'reward_expires_at' => 'datetime',
        'reward_redeemed_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'menu_item_id');
    }
}
