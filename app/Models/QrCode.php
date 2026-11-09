<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class QrCode extends Model
{
    use BelongsToRestaurant;

    protected $fillable = ['restaurant_id', 'branch_id', 'code', 'table_label', 'scans_count'];

    protected static function booted(): void
    {
        static::creating(function (QrCode $qr) {
            // Short, unambiguous, permanent code (no 0/o/1/l).
            do {
                $code = substr(str_shuffle(str_repeat('abcdefghjkmnpqrstuvwxyz23456789', 3)), 0, 8);
            } while (static::withoutRestaurantScope()->where('code', $code)->exists());

            $qr->code ??= $code;
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
