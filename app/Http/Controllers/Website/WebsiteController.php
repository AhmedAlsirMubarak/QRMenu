<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Restaurant;
use App\Models\SubscriptionPlan;
use App\Services\ImageStore;
use App\Services\Website\WebsiteContent;
use Inertia\Inertia;
use Inertia\Response;

class WebsiteController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('website/home', [
            'contactTopics' => array_keys(\App\Models\ContactMessage::TOPICS),
            'contactEmail' => \App\Models\SiteSetting::get('support_email'),
            'page' => WebsiteContent::page('home'),
            'chrome' => WebsiteContent::chrome(),
            'plans' => SubscriptionPlan::query()->where('is_active', true)->where('is_public', true)->ordered()
                ->get(['id', 'name', 'description', 'price_monthly', 'price_yearly', 'currency', 'max_branches', 'max_languages', 'max_items', 'features', 'trial_days', 'is_featured']),
            'features' => SubscriptionPlan::FEATURES,
            'clients' => $this->clients(6),
            'demoSlug' => $this->clients(1)[0]['slug'] ?? Restaurant::where('status', 'active')->value('slug'),
        ]);
    }

    public function clients(int $limit = 60): array
    {
        return Restaurant::query()
            ->where('is_showcased', true)->where('status', 'active')
            ->orderBy('showcase_order')->orderBy('name')
            ->with('branches:id,restaurant_id,city,area')
            ->limit($limit)
            ->get()
            ->filter(fn (Restaurant $r) => $r->subscription?->isUsable())
            ->map(fn (Restaurant $r) => [
                'name' => $r->name,
                'slug' => $r->slug,
                'tagline' => $r->tagline,
                'logo_url' => $r->logo_url,
                'cover_url' => $r->cover_url,
                'theme' => $r->theme,
                'city' => $r->branches->first()?->city,
                'languages' => $r->languages,
                'branches' => $r->branches->count(),
            ])
            ->values()
            ->all();
    }

    public function clientsPage(): Response
    {
        return Inertia::render('website/clients', [
            'page' => WebsiteContent::page('clients'),
            'chrome' => WebsiteContent::chrome(),
            'clients' => $this->clients(),
        ]);
    }

    public function terms(): Response
    {
        return Inertia::render('website/terms', [
            'page' => WebsiteContent::page('terms'),
            'chrome' => WebsiteContent::chrome(),
            'contactEmail' => \App\Models\SiteSetting::get('support_email'),
        ]);
    }

    public function blog(): Response
    {
        $posts = BlogPost::query()->whereNotNull('published_at')->where('published_at', '<=', now())
            ->orderByDesc('is_featured')->orderByDesc('published_at')
            ->paginate(12);

        return Inertia::render('website/blog/index', [
            'page' => WebsiteContent::page('blog'),
            'chrome' => WebsiteContent::chrome(),
            'posts' => $posts->through(fn (BlogPost $p) => $this->postSummary($p)),
            'categories' => BlogPost::whereNotNull('published_at')->whereNotNull('category')->distinct()->pluck('category'),
        ]);
    }

    public function post(string $slug): Response
    {
        $post = BlogPost::where('slug', $slug)->whereNotNull('published_at')->where('published_at', '<=', now())->firstOrFail();

        return Inertia::render('website/blog/show', [
            'page' => WebsiteContent::page('blog'),
            'chrome' => WebsiteContent::chrome(),
            'post' => $this->postSummary($post) + ['body' => $post->body],
            'related' => BlogPost::whereNotNull('published_at')->where('published_at', '<=', now())->whereKeyNot($post->id)
                ->latest('published_at')->limit(3)->get()->map(fn ($p) => $this->postSummary($p)),
        ]);
    }

    protected function postSummary(BlogPost $p): array
    {
        $words = str_word_count(strip_tags(implode(' ', array_filter((array) ($p->body ?? [])))));

        return [
            'slug' => $p->slug,
            'title' => $p->title,
            'excerpt' => $p->excerpt,
            'category' => $p->category,
            'cover_url' => ImageStore::url($p->cover_path),
            'is_featured' => $p->is_featured,
            'published_at' => $p->published_at?->toDateString(),
            'minutes' => max(1, (int) round($words / 200)),
        ];
    }
}
