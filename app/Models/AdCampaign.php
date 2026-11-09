<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use App\Services\ImageStore;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Paid placement on the public Marketplace (platform-level, not tenant scoped). */
class AdCampaign extends Model
{
    use HasTranslations, SoftDeletes;

    public const SLOTS = [
        'banner' => 'Top banner',
        'sponsored' => 'Sponsored listing (pinned first)',
        'sidebar' => 'Sidebar ad',
        'offer' => 'Offer badge on a listing',
    ];

    /** How many campaigns each placement shows at once (offers: one per restaurant card). */
    public const CAPACITY = ['banner' => 1, 'sponsored' => 3, 'sidebar' => 2, 'offer' => null];

    protected array $translatable = ['title', 'subtitle'];

    protected $fillable = [
        'advertiser_type', 'restaurant_id', 'advertiser_name', 'slot', 'priority', 'title', 'subtitle', 'image_path', 'link_url',
        'city', 'starts_at', 'ends_at', 'price', 'currency', 'payment_id', 'is_paused',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'price' => 'decimal:3',
        'is_paused' => 'boolean',
        'priority' => 'integer',
    ];

    protected $appends = ['status', 'image_url'];

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class)->withTrashed();
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /** Currently running and targeting this city (or everywhere). */
    public function scopeLive(Builder $query, ?string $city = null): Builder
    {
        return $query->where('is_paused', false)
            ->where('starts_at', '<=', now())->where('ends_at', '>=', now())
            ->when($city, fn ($q) => $q->where(fn ($q) => $q->whereNull('city')->orWhere('city', $city)));
    }

    /** Highest priority first; campaigns with the same priority rotate on every page view. */
    public function scopeRanked(Builder $query): Builder
    {
        return $query->orderByDesc('priority')->inRandomOrder();
    }

    public function getStatusAttribute(): string
    {
        return match (true) {
            $this->is_paused => 'paused',
            $this->starts_at?->isFuture() => 'scheduled',
            $this->ends_at?->isPast() => 'ended',
            default => 'live',
        };
    }

    public function getImageUrlAttribute(): ?string
    {
        return ImageStore::url($this->image_path);
    }

    public function advertiser(): string
    {
        return $this->restaurant?->name ?? $this->advertiser_name ?? '—';
    }
}
