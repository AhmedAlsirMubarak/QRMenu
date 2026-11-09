<?php

namespace App\Services\Website;

use App\Models\Page;
use Illuminate\Support\Facades\Cache;

/**
 * Public website content: defaults from config/website.php with the super admin's edits
 * (pages table) merged over them section by section. Cached until the next edit.
 */
class WebsiteContent
{
    public const PAGES = ['home', 'marketplace', 'clients', 'blog', 'contact', 'terms'];

    public static function page(string $slug): array
    {
        return Cache::rememberForever("website.page.{$slug}", function () use ($slug) {
            $defaults = config("website.{$slug}");
            $stored = Page::where('slug', $slug)->first();

            if (! $stored) {
                return $defaults;
            }

            return [
                'seo' => self::mergeLanguages($defaults['seo'] ?? [], $stored->seo ?? []),
                'sections' => self::mergeSections($defaults['sections'] ?? [], $stored->sections ?? []),
            ];
        });
    }

    public static function chrome(): array
    {
        return config('website.chrome');
    }

    public static function save(string $slug, array $sections, array $seo): void
    {
        Page::updateOrCreate(['slug' => $slug], [
            'title' => ['en' => ucfirst($slug)],
            'sections' => $sections,
            'seo' => $seo,
            'is_published' => true,
        ]);
        Cache::forget("website.page.{$slug}");
    }

    public static function reset(string $slug): void
    {
        Page::where('slug', $slug)->delete();
        Cache::forget("website.page.{$slug}");
    }

    /** Stored sections keep their order/enabled flags; missing fields fall back to defaults. */
    protected static function mergeSections(array $defaults, array $stored): array
    {
        $byType = collect($defaults)->keyBy('type');
        $result = [];

        foreach ($stored as $section) {
            $default = $byType->pull($section['type'] ?? '');
            if (! $default) {
                continue; // unknown section type
            }
            $result[] = [
                'type' => $default['type'],
                'enabled' => (bool) ($section['enabled'] ?? true),
                'content' => self::mergeLanguages($default['content'], $section['content'] ?? []),
            ];
        }

        // New section types added in code after the admin last saved appear at the end.
        return array_merge($result, $byType->values()->all());
    }

    protected static function mergeLanguages(array $defaults, array $stored): array
    {
        $out = $defaults;
        foreach ($stored as $lang => $values) {
            if (is_array($values)) {
                $out[$lang] = array_replace($defaults[$lang] ?? [], $values);
            }
        }

        return $out;
    }
}
