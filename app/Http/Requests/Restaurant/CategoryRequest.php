<?php

namespace App\Http\Requests\Restaurant;

use App\Http\Requests\Restaurant\Concerns\TranslatedRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class CategoryRequest extends FormRequest
{
    use TranslatedRules;

    public function authorize(): bool
    {
        return Gate::allows('manage-menu');
    }

    public function rules(): array
    {
        return [
            ...$this->translated('name', true, 80),
            ...$this->translated('description', false, 300),
            'image' => ['nullable', 'image', 'max:4096'],
            'remove_image' => ['boolean'],
            'is_active' => ['boolean'],
            'available_from' => ['nullable', 'date_format:H:i'],
            'available_until' => ['nullable', 'date_format:H:i'],
        ];
    }

    public function attributes(): array
    {
        return ['name.en' => 'English name', 'name.ar' => 'Arabic name'];
    }

    public function payload(): array
    {
        return [
            'name' => $this->cleanTranslations($this->input('name')),
            'description' => $this->cleanTranslations($this->input('description')),
            'is_active' => $this->boolean('is_active', true),
            'available_from' => $this->input('available_from'),
            'available_until' => $this->input('available_until'),
        ];
    }
}
