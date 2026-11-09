<?php

namespace App\Http\Requests\Restaurant;

use App\Http\Requests\Restaurant\Concerns\TranslatedRules;
use App\Models\MenuItem;
use App\Support\CurrentRestaurant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ItemRequest extends FormRequest
{
    use TranslatedRules;

    public function authorize(): bool
    {
        return Gate::allows('manage-menu');
    }

    public function rules(): array
    {
        $restaurantId = app(CurrentRestaurant::class)->id();
        $item = $this->route('item');

        return [
            ...$this->translated('name', true, 120),
            ...$this->translated('description', false, 500),
            'menu_category_id' => ['required', Rule::exists('menu_categories', 'id')->where('restaurant_id', $restaurantId)->whereNull('deleted_at')],
            'sku' => ['nullable', 'string', 'max:60', Rule::unique('menu_items', 'sku')->where('restaurant_id', $restaurantId)->ignore($item?->id)],
            'price' => ['required', 'numeric', 'min:0', 'max:99999'],
            // The crossed-out "was" price must be higher than the real price, or it shows a fake discount.
            'compare_at_price' => ['nullable', 'numeric', 'gt:price', 'max:99999'],
            'calories' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'is_available' => ['boolean'],
            'is_featured' => ['boolean'],
            'dietary_tags' => ['nullable', 'array'],
            'dietary_tags.*' => [Rule::in(MenuItem::DIETARY_TAGS)],
            'allergens' => ['nullable', 'array'],
            'allergens.*' => [Rule::in(MenuItem::ALLERGENS)],
            'image' => ['nullable', 'image', 'max:4096'],
            'remove_image' => ['boolean'],
            'options' => ['nullable', 'array', 'max:30'],
            'options.*.type' => ['required', Rule::in(['size', 'extra'])],
            'options.*.name' => ['required', 'array'],
            'options.*.name.*' => ['nullable', 'string', 'max:60'],
            'options.*.price' => ['required', 'numeric', 'min:0', 'max:99999'],
        ];
    }

    public function attributes(): array
    {
        return ['menu_category_id' => 'category', 'name.en' => 'English name', 'name.ar' => 'Arabic name', 'compare_at_price' => 'old price'];
    }

    public function messages(): array
    {
        return ['compare_at_price.gt' => 'The old price must be higher than the price, or guests see a fake discount.'];
    }

    public function payload(): array
    {
        return [
            'menu_category_id' => (int) $this->input('menu_category_id'),
            'name' => $this->cleanTranslations($this->input('name')),
            'description' => $this->cleanTranslations($this->input('description')),
            'sku' => $this->input('sku') ?: null,
            'price' => $this->input('price'),
            'compare_at_price' => $this->input('compare_at_price') ?: null,
            'calories' => $this->input('calories') ?: null,
            'is_available' => $this->boolean('is_available', true),
            'is_featured' => $this->boolean('is_featured'),
            'dietary_tags' => array_values($this->input('dietary_tags', [])),
            'allergens' => array_values($this->input('allergens', [])),
        ];
    }

    /** Options with at least one name filled. */
    public function options(): array
    {
        return collect($this->input('options', []))
            ->map(fn ($o, $i) => [
                'type' => $o['type'],
                'name' => $this->cleanTranslations($o['name'] ?? []),
                'price' => $o['price'],
                'sort_order' => $i,
            ])
            ->filter(fn ($o) => ! empty($o['name']))
            ->values()
            ->all();
    }
}
