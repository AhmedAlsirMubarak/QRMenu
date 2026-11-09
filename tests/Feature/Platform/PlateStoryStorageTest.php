<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\PlateStory;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlateStoryStorageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
        Storage::fake('public');
    }

    public function test_uploads_are_resized_re_encoded_and_the_card_is_not_stored(): void
    {
        $r = app(CreateRestaurant::class)->handle(User::factory()->create(), ['name' => 'Bait', 'main_language' => 'en', 'currency' => 'OMR', 'plan_id' => SubscriptionPlan::where('slug', 'professional')->value('id')]);
        app(CurrentRestaurant::class)->set(null);

        $this->withHeader('User-Agent', 'Mozilla/5.0 (iPhone)')->postJson("/{$r->slug}/plate-story", [
            'branch_id' => $r->branches()->first()->id, 'style' => 'dark',
            'before' => UploadedFile::fake()->image('b.jpg', 3000, 2000),
            'card' => UploadedFile::fake()->image('c.png', 1080, 1920), // sent by old app versions: ignored
        ])->assertOk();

        $story = PlateStory::withoutRestaurantScope()->first();
        $this->assertNull($story->card_path);
        Storage::disk('public')->assertExists($story->before_path);
        $this->assertCount(1, Storage::disk('public')->allFiles("restaurants/{$r->id}/stories"));

        if (function_exists('imagecreatefromstring')) {
            [$w, $h] = getimagesizefromstring(Storage::disk('public')->get($story->before_path));
            $this->assertSame(1080, max($w, $h));
        }
    }

    public function test_cleanup_removes_unneeded_photos_but_keeps_rows(): void
    {
        $r = app(CreateRestaurant::class)->handle(User::factory()->create(), ['name' => 'Bait', 'main_language' => 'en', 'currency' => 'OMR']);
        app(CurrentRestaurant::class)->set(null);
        $branch = $r->branches()->first()->id;

        $make = function (string $status, int $daysOld, ?int $item = null) use ($r, $branch) {
            $path = "restaurants/{$r->id}/stories/".uniqid().'.webp';
            Storage::disk('public')->put($path, str_repeat('x', 1000));
            $s = PlateStory::withoutRestaurantScope()->create(['restaurant_id' => $r->id, 'branch_id' => $branch, 'menu_item_id' => $item, 'before_path' => $path, 'card_style' => 'dark', 'status' => $status, 'session_hash' => 'h']);
            $s->forceFill(['created_at' => now()->subDays($daysOld), 'updated_at' => now()->subDays($daysOld)])->saveQuietly();

            return $s;
        };

        $hiddenOld = $make('hidden', 10);
        $hiddenNew = $make('hidden', 2);
        $pendingOld = $make('pending', 40);
        $approved = $make('approved', 100);

        $this->artisan('plate-stories:cleanup')->assertSuccessful();

        foreach ([$hiddenOld, $pendingOld] as $s) {
            $s->refresh();
            $this->assertNull($s->before_path);
            $this->assertNotNull($s->photos_deleted_at);
        }
        $this->assertSame('hidden', $pendingOld->status);
        $this->assertNotNull($hiddenNew->fresh()->before_path);
        $this->assertNotNull($approved->fresh()->before_path);
        $this->assertSame(4, PlateStory::withoutRestaurantScope()->count()); // statistics keep every story
        $this->assertSame(2000, Cache::get('storage.usage')['restaurants'][$r->id]['total']);
    }
}
