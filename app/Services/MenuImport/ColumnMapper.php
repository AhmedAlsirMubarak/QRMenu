<?php

namespace App\Services\MenuImport;

/**
 * Knows the importable fields and matches spreadsheet headers to them,
 * e.g. "Name", "Dish name", "name_en", "الاسم" → name.en / name.ar.
 */
class ColumnMapper
{
    public const SIMPLE_FIELDS = [
        'sku' => 'SKU / code',
        'price' => 'Price',
        'compare_at_price' => 'Old price',
        'currency' => 'Currency',
        'image_url' => 'Image URL',
        'is_available' => 'Available (1/0)',
        'is_featured' => 'Featured (1/0)',
        'dietary_tags' => 'Dietary labels',
        'allergens' => 'Allergens',
        'calories' => 'Calories',
        'sort_order' => 'Sort order',
        'options' => 'Sizes & extras',
    ];

    public const TRANSLATED_FIELDS = ['category' => 'Category', 'name' => 'Name', 'description' => 'Description'];

    /** {main} = the restaurant's main language. */
    protected const ALIASES = [
        'name' => 'name.{main}', 'item' => 'name.{main}', 'item_name' => 'name.{main}', 'dish' => 'name.{main}',
        'dish_name' => 'name.{main}', 'product' => 'name.{main}', 'product_name' => 'name.{main}', 'title' => 'name.{main}',
        'الاسم' => 'name.ar', 'اسم' => 'name.ar', 'اسم_الطبق' => 'name.ar', 'اسم_المنتج' => 'name.ar', 'الصنف' => 'name.ar', 'الطبق' => 'name.ar',
        'category' => 'category.{main}', 'section' => 'category.{main}', 'category_name' => 'category.{main}', 'group' => 'category.{main}', 'menu_section' => 'category.{main}',
        'القسم' => 'category.ar', 'الفئة' => 'category.ar', 'التصنيف' => 'category.ar',
        'description' => 'description.{main}', 'desc' => 'description.{main}', 'details' => 'description.{main}',
        'الوصف' => 'description.ar',
        'price' => 'price', 'unit_price' => 'price', 'selling_price' => 'price', 'السعر' => 'price',
        'old_price' => 'compare_at_price', 'compare_at_price' => 'compare_at_price', 'original_price' => 'compare_at_price', 'was_price' => 'compare_at_price', 'السعر_القديم' => 'compare_at_price',
        'currency' => 'currency', 'العملة' => 'currency',
        'image' => 'image_url', 'image_url' => 'image_url', 'photo' => 'image_url', 'picture' => 'image_url', 'img' => 'image_url', 'الصورة' => 'image_url',
        'available' => 'is_available', 'is_available' => 'is_available', 'in_stock' => 'is_available', 'متوفر' => 'is_available',
        'featured' => 'is_featured', 'is_featured' => 'is_featured', 'chef_pick' => 'is_featured', 'مميز' => 'is_featured',
        'dietary' => 'dietary_tags', 'dietary_tags' => 'dietary_tags', 'tags' => 'dietary_tags', 'labels' => 'dietary_tags',
        'allergens' => 'allergens', 'allergen' => 'allergens', 'الحساسية' => 'allergens', 'مسببات_الحساسية' => 'allergens',
        'calories' => 'calories', 'kcal' => 'calories', 'السعرات' => 'calories', 'السعرات_الحرارية' => 'calories',
        'sort' => 'sort_order', 'sort_order' => 'sort_order', 'order' => 'sort_order', 'position' => 'sort_order', 'الترتيب' => 'sort_order',
        'options' => 'options', 'sizes' => 'options', 'extras' => 'options', 'sizes_&_extras' => 'options', 'sizes_and_extras' => 'options', 'الأحجام_والإضافات' => 'options',
        'sku' => 'sku', 'code' => 'sku', 'item_code' => 'sku', 'product_code' => 'sku', 'الرمز' => 'sku',
    ];

    /** @return array<string, string> field key => label, for this restaurant's languages */
    public static function fields(array $languages, array $languageNames = []): array
    {
        $fields = [];
        foreach (self::TRANSLATED_FIELDS as $field => $label) {
            foreach ($languages as $lang) {
                $fields["{$field}.{$lang}"] = $label.' ('.($languageNames[$lang] ?? strtoupper($lang)).')';
            }
        }

        return $fields + self::SIMPLE_FIELDS;
    }

    /** Template / export header for a field key: name.en → name_en */
    public static function header(string $field): string
    {
        return str_replace('.', '_', $field);
    }

    public static function normalize(string $header): string
    {
        $header = preg_replace('/\(.*?\)|\*|:/u', '', $header);
        $header = mb_strtolower(trim($header));

        return trim(preg_replace('/[\s\-\.\/]+/u', '_', $header), '_');
    }

    /**
     * @param  list<string>  $headers
     * @return array<string, int> field key => column index
     */
    public static function autoMap(array $headers, array $languages, string $mainLanguage): array
    {
        $map = [];

        foreach ($headers as $index => $header) {
            $key = self::normalize((string) $header);
            $field = null;

            if (preg_match('/^(name|category|description)_([a-z]{2})$/', $key, $m)) {
                $field = "{$m[1]}.{$m[2]}";
            } elseif (isset(self::ALIASES[$key])) {
                $field = str_replace('{main}', $mainLanguage, self::ALIASES[$key]);
            }

            if (! $field) {
                continue;
            }

            // Translated field in a language the restaurant doesn't use → skip.
            if (preg_match('/^(name|category|description)\.([a-z]{2})$/', $field, $m) && ! in_array($m[2], $languages, true)) {
                continue;
            }

            $map[$field] ??= $index; // first matching column wins
        }

        return $map;
    }
}
