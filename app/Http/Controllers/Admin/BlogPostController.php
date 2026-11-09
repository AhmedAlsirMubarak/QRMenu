<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Services\ImageStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BlogPostController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/blog/index', [
            'posts' => BlogPost::query()->latest('id')->get()->map(fn (BlogPost $p) => [
                'id' => $p->id, 'slug' => $p->slug, 'title' => $p->title, 'category' => $p->category,
                'is_featured' => $p->is_featured, 'published_at' => $p->published_at?->toIso8601String(),
                'cover_url' => ImageStore::url($p->cover_path),
            ]),
        ]);
    }

    public function create(): Response
    {
        return $this->editor(new BlogPost(['title' => [], 'excerpt' => [], 'body' => []]));
    }

    public function edit(BlogPost $post): Response
    {
        return $this->editor($post);
    }

    public function store(Request $request): RedirectResponse
    {
        $post = BlogPost::create($this->validated($request) + ['author_id' => $request->user()->id]);
        $this->saveCover($request, $post);
        $this->toast('Post created.');

        return redirect()->route('admin.blog.edit', $post);
    }

    public function update(Request $request, BlogPost $post): RedirectResponse
    {
        $post->update($this->validated($request, $post));
        $this->saveCover($request, $post);
        $this->toast('Post saved.');

        return back();
    }

    public function destroy(BlogPost $post): RedirectResponse
    {
        $post->delete();
        $this->toast('Post deleted.');

        return redirect()->route('admin.blog.index');
    }

    protected function editor(BlogPost $post): Response
    {
        return Inertia::render('admin/blog/edit', [
            'post' => $post->exists ? [
                'id' => $post->id, 'slug' => $post->slug, 'title' => $post->title, 'excerpt' => $post->excerpt, 'body' => $post->body,
                'category' => $post->category, 'is_featured' => $post->is_featured,
                'published_at' => $post->published_at?->format('Y-m-d\TH:i'), 'cover_url' => ImageStore::url($post->cover_path),
            ] : null,
            'categories' => BlogPost::whereNotNull('category')->distinct()->pluck('category'),
        ]);
    }

    protected function validated(Request $request, ?BlogPost $post = null): array
    {
        $request->merge(['slug' => Str::slug($request->input('slug') ?: $request->input('title.en') ?: Str::random(8))]);

        $data = $request->validate([
            'title.en' => ['required', 'string', 'max:160'],
            'title.ar' => ['nullable', 'string', 'max:160'],
            'excerpt.en' => ['nullable', 'string', 'max:300'],
            'excerpt.ar' => ['nullable', 'string', 'max:300'],
            'body.en' => ['nullable', 'string', 'max:50000'],
            'body.ar' => ['nullable', 'string', 'max:50000'],
            'slug' => ['required', 'alpha_dash', 'max:120', Rule::unique('blog_posts', 'slug')->ignore($post?->id)],
            'category' => ['nullable', 'string', 'max:40'],
            'is_featured' => ['boolean'],
            'published_at' => ['nullable', 'date'],
            'cover' => ['nullable', 'image', 'max:5120'],
        ]);

        unset($data['cover']);
        // Body is plain text with light Markdown (rendered safely in React, never as HTML).
        foreach (['title', 'excerpt', 'body'] as $field) {
            $data[$field] = array_map(fn ($v) => strip_tags((string) $v), array_filter($data[$field] ?? []));
        }
        $data['is_featured'] = $request->boolean('is_featured');

        return $data;
    }

    protected function saveCover(Request $request, BlogPost $post): void
    {
        if ($request->hasFile('cover')) {
            $post->update(['cover_path' => $request->file('cover')->store('blog', 'public')]);
        } elseif ($request->boolean('remove_cover')) {
            ImageStore::delete($post->cover_path);
            $post->update(['cover_path' => null]);
        }
    }
}
