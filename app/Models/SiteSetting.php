<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/** Platform-wide settings edited by the super admin (brand name, logo, contact...). */
class SiteSetting extends Model
{
    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'array'];

    public const DEFAULTS = [
        'brand_name' => 'QRMenu',
        'brand_logo' => null,
        'support_email' => null,
        'default_currency' => 'OMR',
        'trial_days' => 14,
        'notify_plan_expiry' => true,
        'notify_invoices' => true,
        'notify_admin_digest' => true,
        'notify_winback' => true,
        'auto_delete_expired' => true,
    ];

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('site_settings'));
        static::deleted(fn () => Cache::forget('site_settings'));
    }

    public static function allValues(): array
    {
        return Cache::rememberForever('site_settings', function () {
            $stored = static::query()->pluck('value', 'key')
                ->map(fn ($v) => is_array($v) && array_key_exists('v', $v) ? $v['v'] : $v)
                ->all();

            return array_merge(self::DEFAULTS, $stored);
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::allValues()[$key] ?? $default;
    }

    public static function put(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => ['v' => $value]]);
    }
}
