<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Website\WebsiteContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Website CMS: edit each page's sections (order, on/off, English + Arabic text). */
class WebsiteController extends Controller
{
    public function edit(Request $request): Response
    {
        $slug = in_array($request->query('page'), WebsiteContent::PAGES, true) ? $request->query('page') : 'home';

        return Inertia::render('admin/website/index', [
            'slug' => $slug,
            'pages' => WebsiteContent::PAGES,
            'page' => WebsiteContent::page($slug),
            'defaults' => config("website.{$slug}"),
        ]);
    }

    public function update(Request $request, string $slug): RedirectResponse
    {
        abort_unless(in_array($slug, WebsiteContent::PAGES, true), 404);
        $types = collect(config("website.{$slug}.sections"))->pluck('type')->all();

        $data = $request->validate([
            'sections' => ['required', 'array'],
            'sections.*.type' => ['required', Rule::in($types)],
            'sections.*.enabled' => ['boolean'],
            'sections.*.content' => ['array'],
            'sections.*.content.en' => ['array'],
            'sections.*.content.ar' => ['array'],
            'seo' => ['array'],
            'seo.*.title' => ['nullable', 'string', 'max:120'],
            'seo.*.description' => ['nullable', 'string', 'max:300'],
        ]);

        // Keep only the fields each section type defines; strip markup and over-long text.
        // Legal pages have long clauses, so they get a higher length and item limit.
        $legal = in_array($slug, self::LEGAL_PAGES, true);
        self::$maxLength = $legal ? 8000 : 600;
        self::$maxItems = $legal ? 60 : 24;
        $defaults = collect(config("website.{$slug}.sections"))->keyBy('type');
        $sections = collect($data['sections'])->map(fn ($s) => [
            'type' => $s['type'],
            'enabled' => (bool) ($s['enabled'] ?? true),
            'content' => collect(['en', 'ar'])->mapWithKeys(fn ($lang) => [
                $lang => self::clean($s['content'][$lang] ?? [], $defaults[$s['type']]['content'][$lang] ?? []),
            ])->all(),
        ])->unique('type')->values()->all();

        WebsiteContent::save($slug, $sections, [
            'en' => array_map(fn ($v) => strip_tags((string) $v), $data['seo']['en'] ?? []),
            'ar' => array_map(fn ($v) => strip_tags((string) $v), $data['seo']['ar'] ?? []),
        ]);
        $this->toast('Website updated.');

        return back();
    }

    public function reset(string $slug): RedirectResponse
    {
        abort_unless(in_array($slug, WebsiteContent::PAGES, true), 404);
        WebsiteContent::reset($slug);
        $this->toast('Page reset to the original text.');

        return back();
    }

    public const LEGAL_PAGES = ['terms'];

    protected static int $maxLength = 600;

    protected static int $maxItems = 24;

    /** Recursively keep the default's shape: strings stay strings, lists stay lists. */
    protected static function clean(mixed $value, mixed $shape): mixed
    {
        if (is_string($shape)) {
            return mb_substr(trim(strip_tags((string) $value)), 0, self::$maxLength);
        }

        if (is_array($shape) && array_is_list($shape)) {
            $item = $shape[0] ?? '';

            return collect(is_array($value) ? array_values($value) : [])
                ->take(self::$maxItems)
                ->map(fn ($v) => self::clean($v, $item))
                ->filter(fn ($v) => is_array($v) ? array_filter($v) : $v !== '')
                ->values()->all();
        }

        if (is_array($shape)) {
            return collect($shape)->mapWithKeys(fn ($sub, $key) => [$key => self::clean(is_array($value) ? ($value[$key] ?? null) : null, $sub)])->all();
        }

        return null;
    }
}
