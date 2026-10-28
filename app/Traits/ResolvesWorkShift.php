<?php

namespace App\Traits;

use App\Models\Shift;
use App\Models\User;
use App\Models\UserShift;

trait ResolvesWorkShift
{
    /**
     * Helper to resolve the most appropriate work shift for a user on a given date.
     * Prioritizes:
     * 1. The user's underlying base work shift covering that date (multi-day span).
     * 2. The colleague's active work shift on that date (if replacing their duty).
     * 3. The user's most recently assigned work shift.
     * 4. The system default work shift.
     */
    protected function resolveWorkShiftForUser(User $user, string $date, ?User $colleague = null): Shift
    {
        // 1. Underlying base work shift (multi-day roster span) covering $date
        $baseUserShift = UserShift::with('shift')
            ->where('user_id', $user->id)
            ->where('start_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $date);
            })
            ->where(function ($q) {
                // Ignore single-day override records to ensure we get the true base schedule
                $q->whereNull('end_date')->orWhereColumn('start_date', '!=', 'end_date');
            })
            ->whereHas('shift', function ($q) {
                $q->where('is_dayoff', false);
            })
            ->latest('id')
            ->first();

        if ($baseUserShift && $baseUserShift->shift) {
            return $baseUserShift->shift;
        }

        // 2. Colleague's active work shift on $date (if replacing colleague's post)
        if ($colleague) {
            $colleagueShift = $colleague->activeShift($date);
            if ($colleagueShift && !$colleagueShift->is_dayoff) {
                return $colleagueShift;
            }
        }

        // 3. User's most recently assigned multi-day work shift anywhere
        $recentShift = $user->shifts()
            ->where('is_dayoff', false)
            ->where(function ($q) {
                $q->whereNull('user_shifts.end_date')->orWhereColumn('user_shifts.start_date', '!=', 'user_shifts.end_date');
            })
            ->latest('user_shifts.id')
            ->first();

        if ($recentShift) {
            return $recentShift;
        }

        // 4. Default fallback
        return Shift::where('is_dayoff', false)->first() 
            ?? Shift::first();
    }
}
