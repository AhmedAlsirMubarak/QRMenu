<?php

namespace App\Support;

use App\Models\Restaurant;

/**
 * Holds the restaurant (tenant) the current request is working on.
 * Set by the SetCurrentRestaurant middleware for the restaurant dashboard,
 * and by the public menu controller for guest pages.
 */
class CurrentRestaurant
{
    protected ?Restaurant $restaurant = null;

    public function set(?Restaurant $restaurant): void
    {
        $this->restaurant = $restaurant;
    }

    public function get(): ?Restaurant
    {
        return $this->restaurant;
    }

    public function id(): ?int
    {
        return $this->restaurant?->id;
    }

    public function check(): bool
    {
        return $this->restaurant !== null;
    }
}
