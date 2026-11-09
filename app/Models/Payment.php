<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Platform finance record (super admin only — not tenant scoped). */
class Payment extends Model
{
    protected $fillable = [
        'restaurant_id', 'subscription_id', 'invoice_number', 'type', 'payer_name', 'description',
        'amount', 'currency', 'method', 'status', 'due_date', 'paid_at', 'reference', 'notes', 'recorded_by',
    ];

    protected $casts = [
        'amount' => 'decimal:3',
        'due_date' => 'date',
        'paid_at' => 'datetime',
    ];

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class)->withTrashed();
    }

    /** "overdue" is derived: a pending invoice whose due date has passed. */
    public function displayStatus(): string
    {
        return $this->status === 'pending' && $this->due_date && $this->due_date->isPast() && ! $this->due_date->isToday() ? 'overdue' : $this->status;
    }

    public static function nextInvoiceNumber(): string
    {
        $last = static::max('id') ?? 0;

        return 'INV-'.str_pad((string) ($last + 1001), 5, '0', STR_PAD_LEFT);
    }
}
