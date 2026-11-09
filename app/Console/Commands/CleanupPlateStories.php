<?php

namespace App\Console\Commands;

use App\Models\PlateStory;
use App\Models\Restaurant;
use App\Services\ImageStore;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * Keeps Plate Story storage small. Photo files are deleted (the story row stays, for statistics) when:
 *  - the restaurant hid the story more than HIDDEN_DAYS ago;
 *  - it was never approved within PENDING_DAYS;
 *  - it is approved but older than the newest KEEP_PER_DISH for its dish (KEEP_GENERAL for stories without a dish).
 * Story-card images saved by older versions are deleted too (cards are now made and kept on the guest's phone).
 * Also measures disk usage per restaurant for Admin › Global analytics.
 */
class CleanupPlateStories extends Command
{
    public const HIDDEN_DAYS = 7;

    public const PENDING_DAYS = 30;

    public const KEEP_PER_DISH = 12;

    public const KEEP_GENERAL = 24;

    protected $signature = 'plate-stories:cleanup {--dry-run : Show what would be removed}';

    protected $description = 'Delete Plate Story photos that are no longer needed and measure storage use';

    protected int $files = 0;

    protected int $bytes = 0;

    public function handle(): int
    {
        $stories = fn () => PlateStory::withoutRestaurantScope()->whereNull('photos_deleted_at');

        // 1. Hidden by the restaurant a week ago or more.
        $this->purge($stories()->where('status', 'hidden')->where('updated_at', '<', now()->subDays(self::HIDDEN_DAYS))->get());

        // 2. Never approved.
        $this->purge($stories()->where('status', 'pending')->where('created_at', '<', now()->subDays(self::PENDING_DAYS))->get(), 'hidden');

        // 3. Approved, beyond the newest N per dish (the menu only shows the newest few).
        $approved = $stories()->where('status', 'approved')->orderByDesc('id')->get(['id', 'restaurant_id', 'menu_item_id', 'before_path', 'after_path', 'card_path', 'status']);
        $approved->groupBy(fn ($s) => $s->restaurant_id.':'.($s->menu_item_id ?? 'none'))
            ->each(fn (Collection $group, string $key) => $this->purge($group->slice(str_ends_with($key, ':none') ? self::KEEP_GENERAL : self::KEEP_PER_DISH), 'hidden'));

        // 4. Old story-card images (no longer used).
        PlateStory::withoutRestaurantScope()->whereNotNull('card_path')->chunkById(200, function ($chunk) {
            foreach ($chunk as $story) {
                $this->deleteFile($story->card_path);
                if (! $this->option('dry-run')) {
                    $story->forceFill(['card_path' => null])->saveQuietly();
                }
            }
        });

        $this->measure();
        $this->info(sprintf('%s %d files (%.1f MB).', $this->option('dry-run') ? 'Would delete' : 'Deleted', $this->files, $this->bytes / 1048576));

        return self::SUCCESS;
    }

    protected function purge(Collection $stories, ?string $newStatus = null): void
    {
        foreach ($stories as $story) {
            $this->deleteFile($story->before_path);
            $this->deleteFile($story->after_path);
            $this->deleteFile($story->card_path);

            if (! $this->option('dry-run')) {
                $story->forceFill(array_filter([
                    'before_path' => null, 'after_path' => null, 'card_path' => null,
                    'photos_deleted_at' => now(),
                    'status' => $newStatus,
                ], fn ($v, $k) => $k !== 'status' || $v !== null, ARRAY_FILTER_USE_BOTH))->saveQuietly();
            }
        }
    }

    protected function deleteFile(?string $path): void
    {
        if (! $path || str_starts_with($path, 'http')) {
            return;
        }
        $disk = Storage::disk('public');
        if ($disk->exists($path)) {
            $this->bytes += $disk->size($path);
            $this->files++;
            if (! $this->option('dry-run')) {
                ImageStore::delete($path);
            }
        }
    }

    /** Disk use per restaurant (all uploads: logo, cover, dishes, Plate Story), cached for the admin dashboard. */
    protected function measure(): void
    {
        $disk = Storage::disk('public');
        $usage = [];

        foreach (Restaurant::withTrashed()->pluck('id') as $id) {
            $total = 0;
            $stories = 0;
            foreach ($disk->allFiles("restaurants/{$id}") as $file) {
                $size = $disk->size($file);
                $total += $size;
                if (str_contains($file, '/stories/')) {
                    $stories += $size;
                }
            }
            if ($total > 0) {
                $usage[$id] = ['total' => $total, 'stories' => $stories];
            }
        }

        Cache::forever('storage.usage', ['measured_at' => now()->toIso8601String(), 'restaurants' => $usage]);
    }
}
