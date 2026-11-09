<?php

namespace App\Enums;

enum RestaurantRole: string
{
    case Owner = 'owner';
    case Manager = 'manager';
    case Editor = 'editor';

    /** Owner: everything. Manager: menu, feedback, analytics. Editor: categories & items. */
    public function can(string $ability): bool
    {
        return match ($this) {
            self::Owner => true,
            self::Manager => in_array($ability, ['manage-menu', 'view-feedback', 'view-analytics', 'manage-qr', 'manage-plate-story'], true),
            self::Editor => $ability === 'manage-menu',
        };
    }

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
