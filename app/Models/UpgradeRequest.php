<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UpgradeRequest extends Model
{
    use BelongsToRestaurant;

    protected $fillable = ['restaurant_id', 'user_id', 'subscription_plan_id', 'billing_cycle', 'message', 'handled_at'];

    protected $casts = ['handled_at' => 'datetime'];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id')->withTrashed();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
