<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerFeedback extends Model
{
    use BelongsToRestaurant;

    protected $table = 'customer_feedback';

    protected $fillable = [
        'restaurant_id', 'branch_id', 'qr_code_id', 'food_rating', 'service_rating', 'cleanliness_rating',
        'overall_rating', 'comment', 'is_anonymous', 'contact', 'locale', 'alert_sent_at', 'resolved_at',
    ];

    protected $casts = [
        'is_anonymous' => 'boolean',
        'alert_sent_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class)->withTrashed();
    }

    public function qrCode(): BelongsTo
    {
        return $this->belongsTo(QrCode::class);
    }

    public function lowestRating(): ?int
    {
        $ratings = array_filter([$this->food_rating, $this->service_rating, $this->cleanliness_rating, $this->overall_rating]);

        return $ratings ? min($ratings) : null;
    }
}
