<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\ImportBatch;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Spreadsheet\SpreadsheetReader;
use App\Services\Spreadsheet\SpreadsheetWriter;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MenuImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
        Storage::fake('local');
    }

    /** @return array{0: User, 1: Restaurant} */
    protected function restaurant(string $plan = 'professional', string $name = 'Alpha'): array
    {
        $owner = User::factory()->create();
        $restaurant = app(CreateRestaurant::class)->handle($owner, [
            'name' => $name, 'main_language' => 'en', 'languages' => ['ar'], 'currency' => 'OMR',
            'plan_id' => SubscriptionPlan::where('slug', $plan)->value('id'),
        ]);
        app(CurrentRestaurant::class)->set(null);

        return [$owner, $restaurant];
    }

    protected function csv(array $rows, string $name = 'menu.csv'): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 't').'.csv';
        SpreadsheetWriter::write($path, $rows, 'csv');

        return new UploadedFile($path, $name, 'text/csv', null, true);
    }

    protected function xlsx(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 't').'.xlsx';
        SpreadsheetWriter::write($path, $rows, 'xlsx');

        return new UploadedFile($path, 'menu.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    protected function importFlow(User $owner, UploadedFile $file, string $mode): ImportBatch
    {
        $this->actingAs($owner)->post('/app/menu/import', ['file' => $file, 'mode' => $mode])->assertRedirect();
        $batch = ImportBatch::withoutRestaurantScope()->latest('id')->firstOrFail();

        $this->actingAs($owner)->post("/app/menu/import/{$batch->id}/preview", ['mode' => $mode, 'map' => $batch->column_map])->assertSessionHasNoErrors();
        $this->actingAs($owner)->post("/app/menu/import/{$batch->id}/run")->assertSessionHasNoErrors();

        return ImportBatch::withoutRestaurantScope()->find($batch->id);
    }

    public function test_import_creates_categories_and_bilingual_dishes_and_skips_bad_rows(): void
    {
        [$owner] = $this->restaurant();

        $batch = $this->importFlow($owner, $this->csv([
            ['Category', 'القسم', 'Name', 'الاسم', 'Price (OMR)', 'Allergens', 'Code'],
            ['Burgers', 'برجر', 'Classic Burger', 'برجر كلاسيك', '3.500', 'gluten, dairy', 'BRG-1'],
            ['Burgers', 'برجر', 'Chicken Burger', '', '3,2', '', 'BRG-2'],
            ['Drinks', 'مشروبات', 'Karak', 'كرك', '0.5', '', ''],
            ['Drinks', '', 'Broken', '', 'free', '', ''],          // invalid price → skipped
        ]), 'add');

        $this->assertSame('completed', $batch->status);
        $this->assertSame(3, $batch->created_count);
        $this->assertSame(1, $batch->failed_count);
        $this->assertSame(2, MenuCategory::withoutRestaurantScope()->count());

        $burger = MenuItem::withoutRestaurantScope()->where('sku', 'BRG-1')->firstOrFail();
        $this->assertSame('برجر كلاسيك', $burger->name['ar']);
        $this->assertSame('3.500', $burger->price);
        $this->assertSame(['gluten', 'dairy'], $burger->allergens);
        $this->assertSame('3.200', MenuItem::withoutRestaurantScope()->where('sku', 'BRG-2')->value('price'));

        // Error report contains the skipped row with its reason.
        $report = $this->actingAs($owner)->get("/app/menu/import/{$batch->id}/errors");
        $report->assertOk();
        $this->assertStringContainsString('Broken', file_get_contents($report->baseResponse->getFile()->getPathname()));
    }

    public function test_update_mode_changes_prices_without_deleting_or_wiping_anything(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        $category = MenuCategory::create(['restaurant_id' => $restaurant->id, 'name' => ['en' => 'Drinks']]);
        $tea = MenuItem::create(['restaurant_id' => $restaurant->id, 'menu_category_id' => $category->id, 'sku' => 'T1', 'name' => ['en' => 'Tea', 'ar' => 'شاي'], 'description' => ['en' => 'Hot'], 'price' => 0.5]);
        $coffee = MenuItem::create(['restaurant_id' => $restaurant->id, 'menu_category_id' => $category->id, 'name' => ['en' => 'Coffee'], 'price' => 1]);
        $juice = MenuItem::create(['restaurant_id' => $restaurant->id, 'menu_category_id' => $category->id, 'name' => ['en' => 'Juice'], 'price' => 1.5]);

        $batch = $this->importFlow($owner, $this->xlsx([
            ['sku', 'category_en', 'name_en', 'description_en', 'price', 'is_available'],
            ['T1', '', '', '', '0.600', 'no'],          // by SKU, empty cells keep values
            ['', 'Drinks', 'coffee', '', '1.250', ''],  // by category + name (case-insensitive)
            ['', 'Drinks', 'Lemonade', '', '1', ''],     // no match → error in update mode
        ]), 'update');

        $this->assertSame(2, $batch->updated_count);
        $this->assertSame(1, $batch->failed_count);

        app(CurrentRestaurant::class)->set(null);
        $tea->refresh();
        $this->assertSame('0.600', $tea->price);
        $this->assertFalse($tea->is_available);
        $this->assertSame(['en' => 'Tea', 'ar' => 'شاي'], $tea->name);
        $this->assertSame(['en' => 'Hot'], $tea->description);
        $this->assertSame('1.250', $coffee->refresh()->price);
        $this->assertNotSoftDeleted($juice);
        $this->assertSame(3, MenuItem::withoutRestaurantScope()->count());
    }

    public function test_starter_plan_cannot_import_but_can_export(): void
    {
        [$owner] = $this->restaurant('starter');

        $this->actingAs($owner)->post('/app/menu/import', ['file' => $this->csv([['name', 'price'], ['Tea', '1']]), 'mode' => 'add'])->assertForbidden();
        $this->actingAs($owner)->get('/app/menu/export?format=xlsx')->assertOk()->assertDownload();
    }

    public function test_cannot_open_another_restaurants_import(): void
    {
        [$owner] = $this->restaurant();
        [$other] = $this->restaurant('professional', 'Other');
        $this->actingAs($other)->post('/app/menu/import', ['file' => $this->csv([['name', 'price'], ['Tea', '1']]), 'mode' => 'add']);
        $theirBatch = ImportBatch::withoutRestaurantScope()->latest('id')->firstOrFail();

        $this->actingAs($owner)->get("/app/menu/import/{$theirBatch->id}")->assertNotFound();
        $this->actingAs($owner)->post("/app/menu/import/{$theirBatch->id}/run")->assertNotFound();
        $this->actingAs($owner)->get("/app/menu/import/{$theirBatch->id}/errors")->assertNotFound();
    }

    public function test_export_round_trips_through_the_importer(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        $category = MenuCategory::create(['restaurant_id' => $restaurant->id, 'name' => ['en' => 'Grills', 'ar' => 'مشاوي']]);
        MenuItem::create(['restaurant_id' => $restaurant->id, 'menu_category_id' => $category->id, 'sku' => 'G1', 'name' => ['en' => 'Shuwa', 'ar' => 'شواء'], 'price' => 7.2, 'allergens' => ['sesame']]);

        $response = $this->actingAs($owner)->get('/app/menu/export?format=xlsx');
        $rows = array_values(SpreadsheetReader::read($response->baseResponse->getFile()->getPathname(), 'xlsx'));

        $this->assertSame(['category_en', 'category_ar', 'name_en', 'name_ar', 'description_en', 'description_ar', 'sku', 'price'], array_slice($rows[0], 0, 8));
        $this->assertSame(['Grills', 'مشاوي', 'Shuwa', 'شواء'], array_slice($rows[1], 0, 4));

        // Re-importing the export in "Add & update" mode updates instead of duplicating.
        $batch = $this->importFlow($owner, $this->xlsx($rows), 'upsert');
        $this->assertSame(0, $batch->created_count);
        $this->assertSame(1, $batch->updated_count);
        $this->assertSame(1, MenuItem::withoutRestaurantScope()->count());
    }

    public function test_sizes_and_extras_survive_export_and_reimport(): void
    {
        [$owner, $restaurant] = $this->restaurant();
        $category = MenuCategory::create(['restaurant_id' => $restaurant->id, 'name' => ['en' => 'Coffee']]);
        $item = MenuItem::create(['restaurant_id' => $restaurant->id, 'menu_category_id' => $category->id, 'sku' => 'C1', 'name' => ['en' => 'Latte'], 'price' => 1.2]);
        $item->options()->createMany([
            ['type' => 'size', 'name' => ['en' => 'Large', 'ar' => 'كبير'], 'price' => 1.6, 'sort_order' => 0],
            ['type' => 'extra', 'name' => ['en' => 'Oat milk'], 'price' => 0.3, 'sort_order' => 1],
        ]);

        $response = $this->actingAs($owner)->get('/app/menu/export?format=xlsx');
        $rows = array_values(SpreadsheetReader::read($response->baseResponse->getFile()->getPathname(), 'xlsx'));
        $this->assertSame('size: Large | كبير = 1.600; extra: Oat milk |  = 0.300', $rows[1][array_search('options', $rows[0], true)]);

        // Wipe the options, then re-import the export: they come back.
        $item->options()->delete();
        $this->importFlow($owner, $this->xlsx($rows), 'upsert');
        $options = $item->fresh()->options()->orderBy('sort_order')->get();
        $this->assertCount(2, $options);
        $this->assertSame(['en' => 'Large', 'ar' => 'كبير'], $options[0]->name);
        $this->assertSame('0.300', $options[1]->price);
    }

    public function test_negative_price_has_a_clear_message(): void
    {
        [, $restaurant] = $this->restaurant();
        $this->assertContains('Price “-3” can’t be negative.', $this->analyze($restaurant, ['name' => 'Tea', 'price' => '-3']));
        $this->assertContains('Old price “-1” can’t be negative.', $this->analyze($restaurant, ['name' => 'Tea', 'price' => '2', 'old_price' => '-1']));
        $this->assertContains('Price “abc” is not a valid number.', $this->analyze($restaurant, ['name' => 'Tea', 'price' => 'abc']));
    }

    /** Errors for a single row, run through the real analyzer. */
    protected function analyze(Restaurant $restaurant, array $row): array
    {
        $analyzer = new \App\Services\MenuImport\RowAnalyzer(
            languages: $restaurant->languages, mainLanguage: $restaurant->main_language, currency: $restaurant->currency, remainingItems: null,
            existingCategories: [], existingSkus: [], existingNames: [], dietaryTags: [], allergens: [],
        );
        $headers = array_keys($row);
        $map = \App\Services\MenuImport\ColumnMapper::autoMap($headers, $restaurant->languages, $restaurant->main_language);

        return array_values($analyzer->analyze([2 => array_values($row)], $map, 'add')['rows'])[0]['errors'];
    }

    public function test_template_downloads_for_both_formats(): void
    {
        [$owner] = $this->restaurant();

        $this->actingAs($owner)->get('/app/menu/import/template?format=xlsx')->assertOk()->assertDownload('menu-template.xlsx');
        $this->actingAs($owner)->get('/app/menu/import/template?format=csv')->assertOk()->assertDownload('menu-template.csv');
    }
}
