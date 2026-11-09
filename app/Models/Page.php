<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    use HasTranslations;

    protected array $translatable = ['title'];

    protected $fillable = ['slug', 'title', 'sections', 'seo', 'is_published'];

    protected $casts = ['sections' => 'array', 'seo' => 'array', 'is_published' => 'boolean'];
}
