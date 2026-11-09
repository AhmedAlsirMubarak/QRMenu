<?php

namespace App\Services\MenuImport;

/**
 * Pure validation/planning step of the import (no database access): decides for every row
 * whether it creates a dish, updates one, or fails — and why. Lookups are passed in.
 */
class RowAnalyzer
{
    public const MODES = ['add', 'update', 'upsert'];

    protected const TAG_SYNONYMS = [
        'veg' => 'vegetarian', 'vegetarian' => 'vegetarian', 'نباتي' => 'vegetarian',
        'vegan' => 'vegan', 'نباتي_صرف' => 'vegan',
        'spicy' => 'spicy', 'hot' => 'spicy', 'حار' => 'spicy',
        'halal' => 'halal', 'حلال' => 'halal',
        'gluten_free' => 'gluten_free', 'gf' => 'gluten_free', 'خالي_من_الغلوتين' => 'gluten_free',
        'gluten' => 'gluten', 'wheat' => 'gluten', 'غلوتين' => 'gluten', 'جلوتين' => 'gluten',
        'dairy' => 'dairy', 'milk' => 'dairy', 'lactose' => 'dairy', 'ألبان' => 'dairy', 'حليب' => 'dairy',
        'egg' => 'eggs', 'eggs' => 'eggs', 'بيض' => 'eggs',
        'nuts' => 'nuts', 'nut' => 'nuts', 'tree_nuts' => 'nuts', 'مكسرات' => 'nuts',
        'peanut' => 'peanuts', 'peanuts' => 'peanuts', 'فول_سوداني' => 'peanuts',
        'soy' => 'soy', 'soya' => 'soy', 'صويا' => 'soy',
        'fish' => 'fish', 'سمك' => 'fish',
        'shellfish' => 'shellfish', 'seafood' => 'shellfish', 'قشريات' => 'shellfish',
        'sesame' => 'sesame', 'سمسم' => 'sesame',
    ];

    /**
     * @param  array<string, int>  $existingCategories  normalized main-language name => id
     * @param  array<string, int>  $existingSkus  sku => item id
     * @param  array<string, int>  $existingNames  "category_id|normalized name" => item id
     */
    public function __construct(
        protected array $languages,
        protected string $mainLanguage,
        protected string $currency,
        protected ?int $remainingItems,
        protected array $existingCategories,
        protected array $existingSkus,
        protected array $existingNames,
        protected array $dietaryTags,
        protected array $allergens,
    ) {}

    /**
     * @param  array<int, list<string>>  $rows  data rows keyed by line number (header excluded)
     * @param  array<string, int>  $map  field => column index
     */
    public function analyze(array $rows, array $map, string $mode): array
    {
        $results = [];
        $seenSkus = [];
        $seenNames = [];
        $newCategories = [];
        $creates = 0;

        foreach ($rows as $line => $cells) {
            $get = fn (string $field) => isset($map[$field]) ? trim((string) ($cells[$map[$field]] ?? '')) : '';
            $errors = [];
            $warnings = [];
            $data = [];

            // Translations
            foreach (['category', 'name', 'description'] as $field) {
                $values = [];
                foreach ($this->languages as $lang) {
                    if (($v = $get("{$field}.{$lang}")) !== '') {
                        $values[$lang] = $v;
                    }
                }
                if ($values) {
                    $data[$field] = $values;
                }
            }

            $sku = $get('sku') !== '' ? $get('sku') : null;
            $mainName = $data['name'][$this->mainLanguage] ?? null;
            $mainCategory = $data['category'][$this->mainLanguage] ?? null;
            $categoryKey = $mainCategory !== null ? self::key($mainCategory) : null;
            $categoryId = $categoryKey !== null ? ($this->existingCategories[$categoryKey] ?? null) : null;

            // Price
            foreach (['price', 'compare_at_price'] as $priceField) {
                $raw = $get($priceField);
                if ($raw === '') {
                    continue;
                }
                $label = $priceField === 'price' ? 'Price' : 'Old price';
                $price = self::parsePrice($raw);
                if ($price === null) {
                    $errors[] = str_starts_with(ltrim(self::westernDigits($raw)), '-') && self::parsePrice(ltrim(ltrim(self::westernDigits($raw)), '-')) !== null
                        ? "{$label} “{$raw}” can’t be negative."
                        : "{$label} “{$raw}” is not a valid number.";
                } else {
                    $data[$priceField] = $price;
                }
            }
            // Same rule as the dish form: a crossed-out old price below the real price would be a fake discount.
            if (isset($data['price'], $data['compare_at_price']) && (float) $data['compare_at_price'] <= (float) $data['price']) {
                $errors[] = "Old price “{$data['compare_at_price']}” must be higher than the price “{$data['price']}”.";
            }

            // Booleans
            foreach (['is_available' => 'Available', 'is_featured' => 'Featured'] as $field => $label) {
                $raw = $get($field);
                if ($raw === '') {
                    continue;
                }
                $bool = self::parseBool($raw);
                $bool === null ? $warnings[] = "{$label} “{$raw}” not understood (use 1/0 or yes/no) — ignored." : $data[$field] = $bool;
            }

            // Tags
            foreach (['dietary_tags' => $this->dietaryTags, 'allergens' => $this->allergens] as $field => $allowed) {
                $raw = $get($field);
                if ($raw === '') {
                    continue;
                }
                [$valid, $unknown] = self::parseTags($raw, $allowed);
                $data[$field] = $valid;
                if ($unknown) {
                    $warnings[] = 'Unknown '.($field === 'allergens' ? 'allergen' : 'label').'(s) ignored: '.implode(', ', $unknown).'.';
                }
            }

            foreach (['calories', 'sort_order'] as $field) {
                $raw = $get($field);
                if ($raw === '') {
                    continue;
                }
                ctype_digit($raw) ? $data[$field] = (int) $raw : $warnings[] = ucfirst(str_replace('_', ' ', $field))." “{$raw}” must be a whole number — ignored.";
            }

            if (($raw = $get('options')) !== '') {
                $options = self::parseOptions($raw, $this->languages);
                is_string($options) ? $errors[] = $options : $data['options'] = $options;
            }

            if (($url = $get('image_url')) !== '') {
                filter_var($url, FILTER_VALIDATE_URL) && preg_match('#^https?://#i', $url)
                    ? $data['image_path'] = $url
                    : $warnings[] = 'Image URL is not a valid web link — ignored.';
            }

            if (($cur = strtoupper($get('currency'))) !== '' && $cur !== $this->currency) {
                $warnings[] = "Currency {$cur} differs from your menu currency ({$this->currency}); the price was imported as {$this->currency}.";
            }

            // Matching an existing dish
            $matchId = null;
            if ($sku !== null && isset($this->existingSkus[$sku])) {
                $matchId = $this->existingSkus[$sku];
            } elseif ($sku === null && $mainName !== null && $categoryId !== null) {
                $matchId = $this->existingNames[$categoryId.'|'.self::key($mainName)] ?? null;
            }

            // Duplicates inside the file
            if ($sku !== null) {
                if (isset($seenSkus[$sku])) {
                    $errors[] = "Duplicate SKU “{$sku}” (also on row {$seenSkus[$sku]}).";
                }
                $seenSkus[$sku] ??= $line;
            }
            if ($mainName !== null && $categoryKey !== null) {
                $nameKey = $categoryKey.'|'.self::key($mainName);
                if (isset($seenNames[$nameKey]) && $sku === null) {
                    $errors[] = "“{$mainName}” appears twice in “{$mainCategory}” (also row {$seenNames[$nameKey]}).";
                }
                $seenNames[$nameKey] ??= $line;
            }

            $action = match ($mode) {
                'add' => 'create',
                'update' => 'update',
                default => $matchId ? 'update' : 'create',
            };

            if ($action === 'create') {
                if ($mode === 'add' && $matchId) {
                    $errors[] = $sku !== null
                        ? "SKU “{$sku}” is already on your menu — use “Update” or “Add & update” mode."
                        : "“{$mainName}” is already in “{$mainCategory}” — use “Update” or “Add & update” mode.";
                }
                if ($mainName === null) {
                    $errors[] = "Name ({$this->mainLanguage}) is required.";
                }
                if ($mainCategory === null) {
                    $errors[] = "Category ({$this->mainLanguage}) is required.";
                }
                if (! isset($data['price']) && ! array_filter($errors, fn ($e) => str_starts_with($e, 'Price'))) {
                    $errors[] = 'Price is required.';
                }
            } else {
                if (! $matchId) {
                    $errors[] = $sku !== null
                        ? "No dish with SKU “{$sku}” on your menu."
                        : 'No matching dish found (match by SKU, or by category + name).';
                }
            }

            if (! $errors && $action === 'create') {
                if ($this->remainingItems !== null && $creates >= $this->remainingItems) {
                    $errors[] = 'Your plan’s dish limit is reached — upgrade to import more.';
                } else {
                    $creates++;
                }
            }

            if (! $errors && $categoryKey !== null && $categoryId === null && ! isset($newCategories[$categoryKey])) {
                $newCategories[$categoryKey] = $data['category'];
            }

            $data['sku'] = $sku;

            $results[$line] = [
                'line' => $line,
                'action' => $errors ? 'error' : $action,
                'match_id' => $matchId,
                'category_key' => $categoryKey,
                'name' => $mainName ?? (isset($data['name']) ? reset($data['name']) : null),
                'category' => $mainCategory,
                'price' => $data['price'] ?? null,
                'errors' => $errors,
                'warnings' => $warnings,
                'data' => $data,
            ];
        }

        $count = fn ($action) => count(array_filter($results, fn ($r) => $r['action'] === $action));

        return [
            'rows' => $results,
            'summary' => [
                'total' => count($results),
                'create' => $count('create'),
                'update' => $count('update'),
                'error' => $count('error'),
                'warnings' => count(array_filter($results, fn ($r) => $r['warnings'])),
                'new_categories' => array_values(array_map(fn ($c) => $c[$this->mainLanguage] ?? reset($c), $newCategories)),
            ],
            'new_categories' => $newCategories,
        ];
    }

    public static function key(string $value): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $value)));
    }

    /** "3.500", "3,5", "OMR 3.500", "1,250.000" → "3.500" style strings; null if invalid. */
    /**
     * Sizes & extras in one cell: "size: Small | صغير = 1.000; extra: Cheese | جبن = 0.300".
     * Names follow the restaurant's language order, separated by "|".
     *
     * @param  iterable<array{type: string, name: array<string, string>, price: mixed}|\App\Models\MenuItemOption>  $options
     * @param  list<string>  $languages
     */
    public static function formatOptions(iterable $options, array $languages): string
    {
        $parts = [];
        foreach ($options as $o) {
            $names = array_map(fn ($lang) => str_replace(['|', ';', '='], ' ', (string) (data_get($o, "name.{$lang}") ?? '')), $languages);
            $parts[] = data_get($o, 'type').': '.implode(' | ', $names).' = '.number_format((float) data_get($o, 'price'), 3, '.', '');
        }

        return implode('; ', $parts);
    }

    /**
     * @param  list<string>  $languages
     * @return list<array{type: string, name: array<string, string>, price: string, sort_order: int}>|string the options, or an error message
     */
    public static function parseOptions(string $raw, array $languages): array|string
    {
        $options = [];
        foreach (array_filter(array_map('trim', explode(';', $raw))) as $i => $part) {
            if (! preg_match('/^(size|extra)\s*:\s*(.+?)\s*=\s*(.+)$/iu', $part, $m)) {
                return "Sizes & extras “{$part}” should look like “size: Small = 1.000” or “extra: Cheese = 0.300”.";
            }
            $price = self::parsePrice($m[3]);
            if ($price === null) {
                return "Sizes & extras: price “{$m[3]}” for “{$m[2]}” is not a valid number.";
            }
            $names = array_map('trim', explode('|', $m[2]));
            $name = array_filter(array_combine($languages, array_pad(array_slice($names, 0, count($languages)), count($languages), '')), fn ($v) => $v !== '');
            if (! $name) {
                return "Sizes & extras “{$part}” has no name.";
            }
            $options[] = ['type' => strtolower($m[1]), 'name' => $name, 'price' => $price, 'sort_order' => count($options)];
        }

        return count($options) > 30 ? 'Sizes & extras: at most 30 per dish.' : $options;
    }

    public static function parsePrice(string $raw): ?string
    {
        $value = preg_replace('/[^\d.,\-]/u', '', self::westernDigits($raw));
        if ($value === '' || str_starts_with($value, '-')) {
            return null;
        }
        if (str_contains($value, ',') && str_contains($value, '.')) {
            $value = str_replace(',', '', $value);           // 1,250.500
        } elseif (str_contains($value, ',')) {
            $value = str_replace(',', '.', $value);          // 3,500 (decimal comma)
        }
        if (! is_numeric($value) || substr_count($value, '.') > 1) {
            return null;
        }

        return number_format((float) $value, 3, '.', '');
    }

    public static function parseBool(string $raw): ?bool
    {
        $v = mb_strtolower(trim(self::westernDigits($raw)));

        return match (true) {
            in_array($v, ['1', 'yes', 'y', 'true', 'on', 'available', 'نعم', 'متوفر'], true) => true,
            in_array($v, ['0', 'no', 'n', 'false', 'off', 'unavailable', 'sold out', 'لا', 'غير متوفر'], true) => false,
            default => null,
        };
    }

    /** @return array{0: list<string>, 1: list<string>} [valid, unknown] */
    public static function parseTags(string $raw, array $allowed): array
    {
        $valid = [];
        $unknown = [];
        foreach (preg_split('/[,;|،]+/u', $raw) as $part) {
            $part = trim($part);
            if ($part === '') {
                continue;
            }
            $key = str_replace([' ', '-'], '_', mb_strtolower($part));
            $tag = self::TAG_SYNONYMS[$key] ?? $key;
            in_array($tag, $allowed, true) ? $valid[] = $tag : $unknown[] = $part;
        }

        return [array_values(array_unique($valid)), $unknown];
    }

    /** Arabic-Indic digits (٠-٩) → 0-9, Arabic decimal separator → dot. */
    protected static function westernDigits(string $value): string
    {
        return strtr($value, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9', '٫' => '.', '٬' => ',']);
    }
}
