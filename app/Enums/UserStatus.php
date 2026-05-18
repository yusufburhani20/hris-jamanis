<?php

namespace App\Enums;

enum UserStatus: string
{
    case active = 'active';
    case inactive = 'inactive';
    case suspended = 'suspended';

    public function label(): string
    {
        return match($this) {
            self::active => 'Active',
            self::inactive => 'Inactive',
            self::suspended => 'Suspended',
        };
    }
}
