<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Enums\RestaurantRole;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MenuBuilderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
        Storage::fake('public');
    }

    /** @return array{0: User, 1: Restaurant} */
    protected function restaurant(string $name = 'Alpha', string $plan = 'professional'): array
    {
        $owner = User::factory()->create();
        $restaurant = app(CreateRestaurant::class)->handle($owner, [
            'name' => $name, 'main_language' => 'en', 'languages' => ['ar'], 'currency' => 'OMR',
            'plan_id' => SubscriptionPlan::where('slug', $plan)->value('id'),
        ]);
        app(CurrentRestaurant::class)->set(null);

        return [$owner, $restaurant];
    }

    protected function category(Restaurant $restaurant, string $name = 'Breakfast'): MenuCategory
    {
        return MenuCategory::create(['restaurant_id' => $restaurant->id, 'name' => ['en' => $name]]);
    }

    public function test_owner_can_build_a_bilingual_menu_with_photo_labels_and_sizes(): void
    {
        [$owner] = $this->restaurant();

        $this->actingAs($owner)->post('/app/menu/categories', ['name' => ['en' => 'Breakfast', 'ar' => 'فطور']])->assertRedirect();
        $category = MenuCategory::withoutRestaurantScope()->firstOrFail();
        $this->assertSame('فطور', $category->name['ar']);

        $this->actingAs($owner)->post('/app/menu/items', [
            'menu_category_id' => $category->id,
            'name' => ['en' => 'Shakshuka', 'ar' => 'شكشوكة'],
            'description' => ['en' => 'Eggs in tomato'],
            'price' => '2.400',
            'dietary_tags' => ['vegetarian'],
            'allergens' => ['eggs'],
            'image' => UploadedFile::fake()->image('dish.jpg'),
            'options' => [
                ['type' => 'size', 'name' => ['en' => 'Large', 'ar' => 'كبير'], 'price' => '3.200'],
                ['type' => 'extra', 'name' => ['en' => ''], 'price' => '0.5'], // empty name → dropped
            ],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $item = MenuItem::withoutRestaurantScope()->with('options')->firstOrFail();
        $this->assertSame('2.400', $item->price);
        $this->assertSame(['vegetarian'], $item->dietary_tags);
        $this->assertCount(1, $item->options);
        $this->assertNotNull($item->image_path);
        Storage::disk('public')->assertExists($item->image_path);

        $this->actingAs($owner)->get('/app/menu')->assertOk();
    }

    public function test_old_price_must_be_higher_and_deleting_a_dish_removes_its_photo(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        $category = $this->category($restaurant);
        $dish = fn (array $extra) => ['menu_category_id' => $category->id, 'name' => ['en' => 'Shakshuka'], 'price' => '1.250'] + $extra;

        // A crossed-out price lower than the real one would be a fake discount.
        $this->actingAs($owner)->post('/app/menu/items', $dish(['compare_at_price' => '1.000']))->assertSessionHasErrors('compare_at_price');
        $this->actingAs($owner)->post('/app/menu/items', $dish(['compare_at_price' => '1.500', 'image' => UploadedFile::fake()->image('dish.jpg')]))->assertSessionHasNoErrors();

        $item = MenuItem::withoutRestaurantScope()->firstOrFail();
        Storage::disk('public')->assertExists($path = $item->image_path);

        $this->actingAs($owner)->delete("/app/menu/items/{$item->id}")->assertRedirect();
        Storage::disk('public')->assertMissing($path);
        $this->assertNull(MenuItem::withoutRestaurantScope()->withTrashed()->find($item->id)->image_path);
    }

    public function test_main_language_name_is_required(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        $category = $this->category($restaurant);

        $this->actingAs($owner)->post('/app/menu/items', [
            'menu_category_id' => $category->id, 'name' => ['ar' => 'شكشوكة'], 'price' => 1,
        ])->assertSessionHasErrors('name.en');
    }

    public function test_a_restaurant_cannot_touch_another_restaurants_dishes(): void
    {
        [$owner] = $this->restaurant('Mine');
        [, $other] = $this->restaurant('Other');
        $theirCategory = $this->category($other, 'Their category');
        $theirItem = MenuItem::create(['restaurant_id' => $other->id, 'menu_category_id' => $theirCategory->id, 'name' => ['en' => 'Secret'], 'price' => 1]);

        $this->actingAs($owner)->put("/app/menu/items/{$theirItem->id}", ['menu_category_id' => $theirCategory->id, 'name' => ['en' => 'Hacked'], 'price' => 0])->assertNotFound();
        $this->actingAs($owner)->delete("/app/menu/items/{$theirItem->id}")->assertNotFound();
        $this->actingAs($owner)->delete("/app/menu/categories/{$theirCategory->id}")->assertNotFound();

        // Cannot file a dish of their own under someone else's category either.
        $this->actingAs($owner)->post('/app/menu/items', ['menu_category_id' => $theirCategory->id, 'name' => ['en' => 'X'], 'price' => 1])
            ->assertSessionHasErrors('menu_category_id');

        // Reordering with foreign ids does nothing to them.
        $this->actingAs($owner)->post('/app/menu/items/reorder', ['ids' => [$theirItem->id]]);

        // (The test's tenant context is still "Mine" after the requests, so read without the scope.)
        $fresh = MenuItem::withoutRestaurantScope()->find($theirItem->id);
        $this->assertSame('Secret', $fresh->name['en']);
        $this->assertSame(0, $fresh->sort_order);
        $this->assertNotSoftDeleted($theirItem);
    }

    public function test_plan_item_limit_is_enforced(): void
    {
        [$owner, $restaurant] = $this->restaurant('Tiny', 'starter');
        SubscriptionPlan::where('slug', 'starter')->update(['max_items' => 1]);
        $category = $this->category($restaurant);

        $payload = ['menu_category_id' => $category->id, 'name' => ['en' => 'One'], 'price' => 1];
        $this->actingAs($owner)->post('/app/menu/items', $payload);
        $this->actingAs($owner)->post('/app/menu/items', ['name' => ['en' => 'Two']] + $payload);

        $this->assertSame(1, MenuItem::withoutRestaurantScope()->count());
    }

    public function test_language_limit_is_enforced_in_menu_settings(): void
    {
        [$owner, $restaurant] = $this->restaurant('Tiny', 'starter'); // starter = 2 languages

        $this->actingAs($owner)->put('/app/menu/settings', [
            'main_language' => 'en', 'languages' => ['en', 'ar', 'fr'], 'currency' => 'OMR', 'theme' => 'saffron',
        ])->assertSessionHasErrors('languages');

        $this->actingAs($owner)->put('/app/menu/settings', [
            'main_language' => 'ar', 'languages' => ['en'], 'currency' => 'AED', 'theme' => 'noir',
        ])->assertSessionHasNoErrors();

        $restaurant->refresh();
        $this->assertSame(['ar', 'en'], $restaurant->languages);
        $this->assertSame('AED', $restaurant->currency);
    }

    public function test_editor_can_manage_menu_but_not_restaurant_settings(): void
    {
        [, $restaurant] = $this->restaurant();
        $editor = User::factory()->create();
        $restaurant->users()->attach($editor->id, ['role' => RestaurantRole::Editor->value]);

        $this->actingAs($editor)->post('/app/menu/categories', ['name' => ['en' => 'Drinks']])->assertSessionHasNoErrors();
        $this->actingAs($editor)->get('/app/profile')->assertForbidden();
        $this->actingAs($editor)->get('/app/branches')->assertForbidden();
        $this->actingAs($editor)->put('/app/menu/settings', ['main_language' => 'en', 'currency' => 'USD', 'theme' => 'noir'])->assertForbidden();
    }

    public function test_branch_limit_and_branch_gets_a_qr_code(): void
    {
        [$owner, $restaurant] = $this->restaurant('Group', 'business'); // 5 branches

        $this->actingAs($owner)->post('/app/branches', ['name' => 'Qurum', 'city' => 'Muscat'])->assertSessionHasNoErrors();
        $this->assertSame(2, $restaurant->branches()->count());
        $this->assertSame(1, $restaurant->branches()->where('name', 'Qurum')->first()->qrCodes()->count());

        [$small] = $this->restaurant('Small', 'starter'); // 1 branch
        $this->actingAs($small)->post('/app/branches', ['name' => 'Second']);
        $this->assertSame(1, Restaurant::where('name', 'Small')->first()->branches()->count());
    }

    public function test_owner_can_update_profile_and_logo(): void
    {
        [$owner, $restaurant] = $this->restaurant();

        $this->actingAs($owner)->post('/app/profile', [
            'name' => 'Alpha Café', 'slug' => 'alpha-cafe', 'instagram_handle' => '@alphacafe',
            'google_review_url' => 'https://g.page/r/abc/review', 'google_rating' => 4.6,
            'tagline' => ['en' => 'Coffee & more', 'ar' => 'قهوة وأكثر'],
            'logo' => UploadedFile::fake()->image('logo.png'),
        ])->assertSessionHasNoErrors();

        $restaurant->refresh();
        $this->assertSame('alpha-cafe', $restaurant->slug);
        $this->assertSame('alphacafe', $restaurant->instagram_handle);
        $this->assertNotNull($restaurant->logo_url);
    }
}
