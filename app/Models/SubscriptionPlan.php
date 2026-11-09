<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubscriptionPlan extends Model
{
    use HasTranslations, SoftDeletes;

    /** Feature keys a plan can switch on. Labels are shown in the admin form. */
    public const FEATURES = [
        'table_qr' => 'Table QR codes',
        'csv_import' => 'CSV / Excel import',
        'analytics' => 'Menu analytics',
        'branch_comparison' => 'Branch comparison',
        'premium_themes' => 'Premium themes',
        'plate_story' => 'Plate Story',
        'feedback_alerts' => 'Low-rating email alerts',
        'ai_translation' => 'AI translation',
        'staff_roles' => 'Staff roles & permissions',
    ];

    protected array $translatable = ['name', 'description'];

    protected $fillable = [
        'name', 'slug', 'description', 'price_monthly', 'price_yearly', 'currency',
        'max_branches', 'max_languages', 'max_items', 'features', 'trial_days',
        'is_active', 'is_public', 'is_featured', 'sort_order',
    ];

    protected $casts = [
        'price_monthly' => 'decimal:3',
        'price_yearly' => 'decimal:3',
        'features' => 'array',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'is_featured' => 'boolean',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? [], true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('price_monthly');
    }
}
