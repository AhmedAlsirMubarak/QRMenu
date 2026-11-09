<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Stores restaurant images on the public disk, grouped per restaurant.
 * (Resizing/WebP conversion with Intervention Image can be added here later.)
 */
class ImageStore
{
    public static function put(UploadedFile $file, int $restaurantId, string $folder, ?string $replace = null): string
    {
        if ($replace) {
            static::delete($replace);
        }

        return $file->store("restaurants/{$restaurantId}/{$folder}", 'public');
    }

    public static function delete(?string $path): void
    {
        if ($path && ! str_starts_with($path, 'http')) {
            Storage::disk('public')->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
