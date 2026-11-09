<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;

class ImportBatch extends Model
{
    use BelongsToRestaurant;

    protected $fillable = [
        'restaurant_id', 'user_id', 'filename', 'path', 'extension', 'mode', 'status', 'total_rows', 'created_count',
        'updated_count', 'failed_count', 'column_map', 'headers', 'errors', 'summary', 'completed_at',
    ];

    protected $hidden = ['path'];

    protected $casts = [
        'column_map' => 'array',
        'headers' => 'array',
        'errors' => 'array',
        'summary' => 'array',
        'completed_at' => 'datetime',
    ];

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
