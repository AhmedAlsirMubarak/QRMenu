<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BlogPost extends Model
{
    use HasTranslations, SoftDeletes;

    protected array $translatable = ['title', 'excerpt', 'body'];

    protected $fillable = [
        'slug', 'title', 'excerpt', 'body', 'category', 'cover_path', 'is_featured', 'author_id', 'published_at',
    ];

    protected $casts = ['is_featured' => 'boolean', 'published_at' => 'datetime'];
}
