<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A message sent through the website's Contact page (platform-level, read by super admins). */
class ContactMessage extends Model
{
    public const TOPICS = [
        'general' => 'General question',
        'sales' => 'Plans & pricing',
        'advertising' => 'Advertising on Discover',
        'support' => 'Help with my account',
        'partnership' => 'Partnership',
    ];

    public const STATUSES = ['new', 'read', 'replied', 'archived'];

    protected $fillable = ['topic', 'name', 'email', 'phone', 'company', 'message', 'locale', 'status', 'admin_notes', 'handled_by', 'handled_at', 'ip_hash'];

    protected $casts = ['handled_at' => 'datetime'];

    protected $hidden = ['ip_hash'];

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
