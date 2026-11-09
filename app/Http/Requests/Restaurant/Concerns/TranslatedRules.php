<?php

namespace App\Http\Requests\Restaurant\Concerns;

use App\Support\CurrentRestaurant;

trait TranslatedRules
{
    /** Rules for a {"en": "...", "ar": "..."} field: required in the main language, optional in the others. */
    protected function translated(string $field, bool $required, int $max): array
    {
        $restaurant = app(CurrentRestaurant::class)->get();
        $rules = [$field => [$required ? 'required' : 'nullable', 'array']];

        foreach ($restaurant->languages as $lang) {
            $rules["{$field}.{$lang}"] = [
                $required && $lang === $restaurant->main_language ? 'required' : 'nullable',
                'string',
                "max:{$max}",
            ];
        }

        return $rules;
    }

    /** Keep only the restaurant's languages and drop empty values. */
    protected function cleanTranslations(?array $values): ?array
    {
        $languages = app(CurrentRestaurant::class)->get()->languages;
        $clean = collect($values ?? [])->only($languages)->map(fn ($v) => is_string($v) ? trim($v) : $v)->filter()->all();

        return $clean ?: null;
    }
}
