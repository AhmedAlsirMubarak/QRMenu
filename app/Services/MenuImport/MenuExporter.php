<?php

namespace App\Services\MenuImport;

use App\Models\MenuCategory;
use App\Models\Restaurant;

/** Builds export rows (the same columns the importer understands) and the sample template. */
class MenuExporter
{
    public function __construct(protected Restaurant $restaurant) {}

    public function headers(): array
    {
        $fields = array_keys(ColumnMapper::fields($this->restaurant->languages));

        return array_map(fn ($f) => ColumnMapper::header($f), $fields);
    }

    public function rows(): array
    {
        $languages = $this->restaurant->languages;
        $out = [$this->headers()];

        $categories = MenuCategory::where('restaurant_id', $this->restaurant->id)
            ->orderBy('sort_order')
            ->with(['items' => fn ($q) => $q->orderBy('sort_order'), 'items.options' => fn ($q) => $q->orderBy('sort_order')])
            ->get();

        foreach ($categories as $category) {
            foreach ($category->items as $item) {
                $row = [];
                foreach (['category' => $category->name, 'name' => $item->name, 'description' => $item->description] as $values) {
                    foreach ($languages as $lang) {
                        $row[] = $values[$lang] ?? '';
                    }
                }
                $row[] = $item->sku ?? '';
                $row[] = $item->price;
                $row[] = $item->compare_at_price ?? '';
                $row[] = $this->restaurant->currency;
                $row[] = $item->image_url ?? '';
                $row[] = $item->is_available ? 1 : 0;
                $row[] = $item->is_featured ? 1 : 0;
                $row[] = implode(', ', $item->dietary_tags ?? []);
                $row[] = implode(', ', $item->allergens ?? []);
                $row[] = $item->calories ?? '';
                $row[] = $item->sort_order;
                $row[] = RowAnalyzer::formatOptions($item->options->all(), $languages);
                $out[] = $row;
            }
        }

        return $out;
    }

    public function template(): array
    {
        $languages = $this->restaurant->languages;
        $samples = [
            ['category' => ['en' => 'Burgers', 'ar' => 'برجر'], 'name' => ['en' => 'Classic Burger', 'ar' => 'برجر كلاسيك'], 'description' => ['en' => 'Beef burger, cheddar, pickles', 'ar' => 'برجر لحم، جبن شيدر، مخلل'], 'sku' => 'BRG-001', 'price' => '3.500', 'old' => '', 'tags' => '', 'allergens' => 'gluten, dairy', 'cal' => '650', 'options' => [['size', ['en' => 'Double', 'ar' => 'دبل'], '4.500'], ['extra', ['en' => 'Cheese', 'ar' => 'جبن'], '0.300']]],
            ['category' => ['en' => 'Drinks', 'ar' => 'مشروبات'], 'name' => ['en' => 'Karak Chai', 'ar' => 'شاي كرك'], 'description' => ['en' => 'Cardamom, saffron, milk', 'ar' => 'هيل، زعفران، حليب'], 'sku' => 'DRK-001', 'price' => '0.500', 'old' => '0.700', 'tags' => 'vegetarian', 'allergens' => 'dairy', 'cal' => '', 'options' => []],
        ];

        $out = [$this->headers()];
        foreach ($samples as $s) {
            $row = [];
            foreach (['category', 'name', 'description'] as $field) {
                foreach ($languages as $lang) {
                    $row[] = $s[$field][$lang] ?? '';
                }
            }
            array_push($row, $s['sku'], $s['price'], $s['old'], $this->restaurant->currency, '', 1, 0, $s['tags'], $s['allergens'], $s['cal'], '', RowAnalyzer::formatOptions(array_map(fn ($o) => ['type' => $o[0], 'name' => $o[1], 'price' => $o[2]], $s['options']), $languages));
            $out[] = $row;
        }

        return $out;
    }
}
