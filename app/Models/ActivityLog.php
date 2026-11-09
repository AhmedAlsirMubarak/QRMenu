<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['restaurant_id', 'user_id', 'action', 'subject_type', 'subject_id', 'changes'];

    protected $casts = ['changes' => 'array'];
}
