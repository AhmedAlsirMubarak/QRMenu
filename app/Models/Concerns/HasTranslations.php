<?php

namespace App\Models\Concerns;

/**
 * JSON columns holding one value per language, e.g. {"en":"Shakshuka","ar":"شكشوكة"}.
 * List them in $translatable on the model.
 */
trait HasTranslations
{
    public function initializeHasTranslations(): void
    {
        foreach ($this->translatable ?? [] as $field) {
            $this->casts[$field] = 'array';
        }
    }

    public function translate(string $field, ?string $locale = null, ?string $fallback = null): ?string
    {
        $values = $this->getAttribute($field) ?? [];
        $locale ??= app()->getLocale();

        if (! empty($values[$locale])) {
            return $values[$locale];
        }

        if ($fallback && ! empty($values[$fallback])) {
            return $values[$fallback];
        }

        return collect($values)->filter()->first();
    }

    /** Languages in which this field has no value yet (for "Arabic missing" hints). */
    public function missingTranslations(string $field, array $languages): array
    {
        $values = $this->getAttribute($field) ?? [];

        return array_values(array_filter($languages, fn ($lang) => empty($values[$lang])));
    }
}
