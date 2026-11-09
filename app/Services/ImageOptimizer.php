<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Re-encodes an uploaded photo before it is stored: max size, WebP (or JPEG) and no hidden metadata.
 * Re-encoding drops EXIF data such as the GPS location phones add to photos.
 * Needs PHP's GD extension (standard on Laragon and CloudPanel); without it the file is stored as uploaded.
 */
class ImageOptimizer
{
    public static function store(UploadedFile $file, int $restaurantId, string $folder, int $maxSide = 1080, int $quality = 78): string
    {
        $dir = "restaurants/{$restaurantId}/{$folder}";

        if (! function_exists('imagecreatefromstring') || ! ($image = @imagecreatefromstring((string) file_get_contents($file->getRealPath())))) {
            return $file->store($dir, 'public');
        }

        $image = self::applyOrientation($image, $file);

        $w = imagesx($image);
        $h = imagesy($image);
        $scale = min(1, $maxSide / max($w, $h));
        if ($scale < 1) {
            $resized = imagecreatetruecolor((int) round($w * $scale), (int) round($h * $scale));
            imagecopyresampled($resized, $image, 0, 0, 0, 0, imagesx($resized), imagesy($resized), $w, $h);
            imagedestroy($image);
            $image = $resized;
        }

        ob_start();
        $webp = function_exists('imagewebp') && imagewebp($image, null, $quality);
        if (! $webp) {
            ob_clean();
            imagejpeg($image, null, $quality + 4);
        }
        $bytes = (string) ob_get_clean();
        imagedestroy($image);

        $path = $dir.'/'.Str::random(40).($webp ? '.webp' : '.jpg');
        Storage::disk('public')->put($path, $bytes);

        return $path;
    }

    /** Phones store photos sideways plus a "rotate me" flag; bake the rotation in before the flag is dropped. */
    protected static function applyOrientation(\GdImage $image, UploadedFile $file): \GdImage
    {
        if (! function_exists('exif_read_data') || ! in_array($file->getMimeType(), ['image/jpeg', 'image/jpg'], true)) {
            return $image;
        }

        $orientation = (int) (@exif_read_data($file->getRealPath())['Orientation'] ?? 1);
        $angle = match ($orientation) { 3 => 180, 6 => -90, 8 => 90, default => 0 };

        return $angle ? (imagerotate($image, $angle, 0) ?: $image) : $image;
    }
}
