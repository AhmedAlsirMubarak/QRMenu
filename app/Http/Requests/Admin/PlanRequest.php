<?php

namespace App\Http\Requests\Admin;

use App\Models\SubscriptionPlan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        $plan = $this->route('plan');

        return [
            'name.en' => ['required', 'string', 'max:60'],
            'name.ar' => ['nullable', 'string', 'max:60'],
            'description.en' => ['nullable', 'string', 'max:200'],
            'description.ar' => ['nullable', 'string', 'max:200'],
            'slug' => ['required', 'alpha_dash', 'max:60', Rule::unique('subscription_plans', 'slug')->ignore($plan?->id)],
            'price_monthly' => ['required', 'numeric', 'min:0', 'max:99999'],
            'price_yearly' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'currency' => ['required', Rule::in(array_keys(config('qrmenu.currencies')))],
            'max_branches' => ['nullable', 'integer', 'min:1'],
            'max_languages' => ['nullable', 'integer', 'min:1'],
            'max_items' => ['nullable', 'integer', 'min:1'],
            'trial_days' => ['required', 'integer', 'min:0', 'max:365'],
            'features' => ['array'],
            'features.*' => [Rule::in(array_keys(SubscriptionPlan::FEATURES))],
            'is_active' => ['boolean'],
            'is_public' => ['boolean'],
            'is_featured' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->input('name.en')) {
            $this->merge(['slug' => str($this->input('name.en'))->slug()->toString()]);
        }
    }
}
