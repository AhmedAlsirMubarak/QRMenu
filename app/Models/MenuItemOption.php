<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuItemOption extends Model
{
    use HasTranslations;

    protected array $translatable = ['name'];

    protected $fillable = ['menu_item_id', 'type', 'name', 'price', 'sort_order'];

    protected $casts = ['price' => 'decimal:3'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'menu_item_id');
    }
}
