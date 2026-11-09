<?php

namespace App\Services\MenuImport;

use App\Models\ImportBatch;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Services\PlanLimits;
use App\Services\Spreadsheet\SpreadsheetReader;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Upload → map columns → preview → run. Existing dishes are never deleted; empty cells
 * never wipe existing values in update mode. Everything runs inside one transaction.
 */
class MenuImporter
{
    public const MAX_ROWS = 2000;

    public function __construct(protected Restaurant $restaurant) {}

    public function upload(UploadedFile $file, int $userId, string $mode): ImportBatch
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $path = $file->store("imports/{$this->restaurant->id}", 'local');

        $batch = ImportBatch::create([
            'restaurant_id' => $this->restaurant->id,
            'user_id' => $userId,
            'filename' => $file->getClientOriginalName(),
            'path' => $path,
            'extension' => $extension,
            'mode' => $mode,
            'status' => 'uploaded',
        ]);

        try {
            [$headers, $rows] = $this->readFile($batch);
        } catch (RuntimeException $e) {
            $batch->update(['status' => 'failed', 'errors' => [['line' => 0, 'errors' => [$e->getMessage()]]]]);
            throw $e;
        }

        $batch->update([
            'headers' => $headers,
            'total_rows' => count($rows),
            'column_map' => ColumnMapper::autoMap($headers, $this->restaurant->languages, $this->restaurant->main_language),
        ]);

        return $batch;
    }

    /** Validate every row with the chosen mapping and store a preview. */
    public function preview(ImportBatch $batch, array $map, string $mode): ImportBatch
    {
        [, $rows] = $this->readFile($batch);
        $result = $this->analyzer()->analyze($rows, $map, $mode);

        $batch->update([
            'column_map' => $map,
            'mode' => $mode,
            'status' => 'previewed',
            'failed_count' => $result['summary']['error'],
            'errors' => $this->issues($result['rows']),
            'summary' => $result['summary'] + ['preview' => $this->previewRows($result['rows'])],
        ]);

        return $batch;
    }

    /** Apply the import. Rows with errors are skipped and listed in the error report. */
    public function run(ImportBatch $batch): ImportBatch
    {
        [, $rows] = $this->readFile($batch);
        // Re-analyse against the current database so nothing stale is applied.
        $result = $this->analyzer()->analyze($rows, $batch->column_map ?? [], $batch->mode);

        DB::transaction(function () use ($batch, $result) {
            $categoryIds = $this->createCategories($result['new_categories']);
            $created = 0;
            $updated = 0;
            $nextSort = [];

            foreach ($result['rows'] as $row) {
                if ($row['action'] === 'error') {
                    continue;
                }

                $data = $row['data'];
                $categoryId = $row['category_key'] !== null ? ($categoryIds[$row['category_key']] ?? null) : null;

                if ($row['action'] === 'create') {
                    $nextSort[$categoryId] ??= (int) MenuItem::where('menu_category_id', $categoryId)->max('sort_order') + 1;

                    $newItem = MenuItem::create([
                        'restaurant_id' => $this->restaurant->id,
                        'menu_category_id' => $categoryId,
                        'sku' => $data['sku'],
                        'name' => $data['name'],
                        'description' => $data['description'] ?? null,
                        'price' => $data['price'],
                        'compare_at_price' => $data['compare_at_price'] ?? null,
                        'image_path' => $data['image_path'] ?? null,
                        'is_available' => $data['is_available'] ?? true,
                        'is_featured' => $data['is_featured'] ?? false,
                        'dietary_tags' => $data['dietary_tags'] ?? [],
                        'allergens' => $data['allergens'] ?? [],
                        'calories' => $data['calories'] ?? null,
                        'sort_order' => $data['sort_order'] ?? $nextSort[$categoryId]++,
                    ]);
                    $newItem->options()->createMany($data['options'] ?? []);
                    $created++;

                    continue;
                }

                $item = MenuItem::find($row['match_id']);
                if (! $item) {
                    continue;
                }

                $changes = collect($data)->only([
                    'price', 'compare_at_price', 'image_path', 'is_available', 'is_featured',
                    'dietary_tags', 'allergens', 'calories', 'sort_order',
                ])->all();

                foreach (['name', 'description'] as $field) {
                    if (! empty($data[$field])) {
                        $changes[$field] = array_merge($item->{$field} ?? [], $data[$field]);
                    }
                }
                if ($categoryId) {
                    $changes['menu_category_id'] = $categoryId;
                }

                $item->update($changes);
                // A filled "Sizes & extras" cell replaces the dish's options; an empty one keeps them.
                if (isset($data['options'])) {
                    $item->options()->delete();
                    $item->options()->createMany($data['options']);
                }
                $updated++;
            }

            $batch->update([
                'status' => 'completed',
                'created_count' => $created,
                'updated_count' => $updated,
                'failed_count' => $result['summary']['error'],
                'errors' => $this->issues($result['rows']),
                'summary' => $result['summary'] + ['preview' => $this->previewRows($result['rows'])],
                'completed_at' => now(),
            ]);
        });

        return $batch->fresh();
    }

    /** Rows with errors, original cells + an "errors" column, for download. */
    public function errorReport(ImportBatch $batch): array
    {
        [$headers, $rows] = $this->readFile($batch);
        $issues = collect($batch->errors ?? [])->filter(fn ($i) => ! empty($i['errors']))->keyBy('line');

        $out = [array_merge(['row'], $headers, ['errors'])];
        foreach ($rows as $line => $cells) {
            if ($issue = $issues->get($line)) {
                $out[] = array_merge([$line], array_pad($cells, count($headers), ''), [implode(' ', $issue['errors'])]);
            }
        }

        return $out;
    }

    /** @return array{0: list<string>, 1: array<int, list<string>>} */
    public function readFile(ImportBatch $batch): array
    {
        if (! $batch->path || ! Storage::disk('local')->exists($batch->path)) {
            throw new RuntimeException('The uploaded file is no longer available. Please upload it again.');
        }

        $rows = SpreadsheetReader::read(Storage::disk('local')->path($batch->path), $batch->extension, self::MAX_ROWS);

        if (count($rows) < 2) {
            throw new RuntimeException('The file needs a header row and at least one dish.');
        }
        if (count($rows) - 1 > self::MAX_ROWS) {
            throw new RuntimeException('Please import at most '.self::MAX_ROWS.' dishes per file.');
        }

        $headerLine = array_key_first($rows);
        $headers = $rows[$headerLine];
        unset($rows[$headerLine]);

        return [$headers, $rows];
    }

    protected function analyzer(): RowAnalyzer
    {
        $categories = MenuCategory::where('restaurant_id', $this->restaurant->id)->get(['id', 'name']);
        $categoryIds = [];
        foreach ($categories as $category) {
            $name = $category->name[$this->restaurant->main_language] ?? null;
            if ($name) {
                $categoryIds[RowAnalyzer::key($name)] ??= $category->id;
            }
        }

        $items = MenuItem::where('restaurant_id', $this->restaurant->id)->get(['id', 'sku', 'name', 'menu_category_id']);
        $skus = $items->whereNotNull('sku')->pluck('id', 'sku')->all();
        $names = [];
        foreach ($items as $item) {
            if ($name = $item->name[$this->restaurant->main_language] ?? null) {
                $names[$item->menu_category_id.'|'.RowAnalyzer::key($name)] ??= $item->id;
            }
        }

        $limits = PlanLimits::for($this->restaurant);
        $max = $limits->maxItems();

        return new RowAnalyzer(
            languages: $this->restaurant->languages,
            mainLanguage: $this->restaurant->main_language,
            currency: $this->restaurant->currency,
            remainingItems: $max === null ? null : max(0, $max - $items->count()),
            existingCategories: $categoryIds,
            existingSkus: $skus,
            existingNames: $names,
            dietaryTags: MenuItem::DIETARY_TAGS,
            allergens: MenuItem::ALLERGENS,
        );
    }

    /** @param array<string, array<string, string>> $newCategories normalized key => translations */
    protected function createCategories(array $newCategories): array
    {
        $ids = [];
        foreach (MenuCategory::where('restaurant_id', $this->restaurant->id)->get(['id', 'name']) as $category) {
            if ($name = $category->name[$this->restaurant->main_language] ?? null) {
                $ids[RowAnalyzer::key($name)] ??= $category->id;
            }
        }

        $sort = (int) MenuCategory::where('restaurant_id', $this->restaurant->id)->max('sort_order');
        foreach ($newCategories as $key => $names) {
            if (! isset($ids[$key])) {
                $ids[$key] = MenuCategory::create([
                    'restaurant_id' => $this->restaurant->id,
                    'name' => $names,
                    'sort_order' => ++$sort,
                ])->id;
            }
        }

        return $ids;
    }

    protected function issues(array $rows): array
    {
        return array_values(array_map(
            fn ($r) => ['line' => $r['line'], 'errors' => $r['errors'], 'warnings' => $r['warnings']],
            array_filter($rows, fn ($r) => $r['errors'] || $r['warnings']),
        ));
    }

    protected function previewRows(array $rows): array
    {
        // Errors first, then the rest — capped to keep the page light.
        usort($rows, fn ($a, $b) => [($a['action'] !== 'error'), $a['line']] <=> [($b['action'] !== 'error'), $b['line']]);

        return array_map(fn ($r) => collect($r)->only(['line', 'action', 'name', 'category', 'price', 'errors', 'warnings'])->all(), array_slice($rows, 0, 200));
    }
}
