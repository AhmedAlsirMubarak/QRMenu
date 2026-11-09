<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\SubscriptionPlan;

/** Reads the current plan's limits (null = unlimited) and features for a restaurant. */
class PlanLimits
{
    public function __construct(protected Restaurant $restaurant) {}

    public static function for(Restaurant $restaurant): self
    {
        return new self($restaurant);
    }

    public function plan(): ?SubscriptionPlan
    {
        $subscription = $this->restaurant->subscription;

        return $subscription && $subscription->isUsable() ? $subscription->plan : null;
    }

    public function maxBranches(): ?int
    {
        return $this->plan()?->max_branches ?? 1;
    }

    public function maxLanguages(): ?int
    {
        $plan = $this->plan();

        return $plan ? $plan->max_languages : 1;
    }

    public function maxItems(): ?int
    {
        $plan = $this->plan();

        return $plan ? $plan->max_items : 0;
    }

    public function canAddBranch(): bool
    {
        $max = $this->maxBranches();

        return $max === null || Branch::where('restaurant_id', $this->restaurant->id)->count() < $max;
    }

    public function canAddItems(int $count = 1): bool
    {
        $max = $this->maxItems();

        return $max === null || MenuItem::where('restaurant_id', $this->restaurant->id)->count() + $count <= $max;
    }

    public function has(string $feature): bool
    {
        return (bool) $this->plan()?->hasFeature($feature);
    }

    public function toArray(): array
    {
        return [
            'plan' => $this->plan()?->translate('name'),
            'max_branches' => $this->maxBranches(),
            'max_languages' => $this->maxLanguages(),
            'max_items' => $this->maxItems(),
            'features' => $this->plan()?->features ?? [],
        ];
    }
}
