<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;

class MenuEvent extends Model
{
    use BelongsToRestaurant;

    public const UPDATED_AT = null;

    protected $fillable = [
        'restaurant_id', 'branch_id', 'qr_code_id', 'event', 'subject_type', 'subject_id',
        'session_hash', 'locale', 'source',
    ];
}
