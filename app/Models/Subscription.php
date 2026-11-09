<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use BelongsToRestaurant;

    protected $fillable = [
        'restaurant_id', 'subscription_plan_id', 'billing_cycle', 'price', 'currency', 'status',
        'trial_ends_at', 'starts_at', 'ends_at', 'cancelled_at', 'expired_at',
    ];

    protected $casts = [
        'price' => 'decimal:3',
        'trial_ends_at' => 'datetime',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'expired_at' => 'datetime',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id')->withTrashed();
    }

    /** Days a paid subscription keeps working after its end date while payment is chased. */
    public const GRACE_DAYS = 7;

    public function isUsable(): bool
    {
        return match ($this->status) {
            'trialing' => $this->trial_ends_at === null || $this->trial_ends_at->isFuture(),
            'active' => $this->ends_at === null || $this->ends_at->isFuture(),
            'past_due' => $this->ends_at === null || $this->ends_at->addDays(self::GRACE_DAYS)->isFuture(),
            default => false,
        };
    }
}
