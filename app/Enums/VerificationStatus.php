<?php

namespace App\Enums;

enum VerificationStatus: string
{
    case valid = 'valid';
    case pending = 'pending';
    case rejected = 'rejected';
    case system_flagged = 'system_flagged';

    public function label(): string
    {
        return match($this) {
            self::valid => 'Valid',
            self::pending => 'Pending',
            self::rejected => 'Rejected',
            self::system_flagged => 'System Flagged',
        };
    }
}
