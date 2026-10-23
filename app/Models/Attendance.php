<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use App\Enums\AttendanceStatus;
use App\Enums\VerificationStatus;
use Carbon\Carbon;

class Attendance extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'date' => 'date:Y-m-d',
        'status' => AttendanceStatus::class,
        'verification_status' => VerificationStatus::class,
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'accuracy' => 'float',
        'checkout_accuracy' => 'float',
        'is_mocked' => 'boolean',
    ];
    
    protected $appends = ['photo_url', 'checkout_photo_url', 'time_details', 'late_details', 'overtime_details', 'early_leave_details'];


    public static function injectDayOffs($attendances, $startDate, $endDate, $userId = null, $search = null)
    {
        $start = \Carbon\Carbon::parse($startDate);
        $end = \Carbon\Carbon::parse($endDate);

        $existing = [];
        foreach ($attendances as $att) {
            $dateStr = $att->date instanceof \Carbon\Carbon ? $att->date->toDateString() : (string) $att->date;
            $existing[$att->user_id][$dateStr] = true;
        }

        $newAttendances = collect();

        // 1. Injeksi Pengajuan Cuti & Izin yang Disetujui (Approved Leaves)
        $leaveQuery = \App\Models\Leave::with('user')
            ->where('status', 'approved')
            ->where('start_date', '<=', $end->toDateString())
            ->where('end_date', '>=', $start->toDateString());

        if ($userId) {
            $leaveQuery->where('user_id', $userId);
        }

        $approvedLeaves = $leaveQuery->get();

        foreach ($approvedLeaves as $leave) {
            $user = $leave->user;
            if (!$user) continue;

            $lStart = \Carbon\Carbon::parse($leave->start_date)->max($start);
            $lEnd = \Carbon\Carbon::parse($leave->end_date)->min($end);

            for ($d = $lStart->copy(); $d->lte($lEnd); $d->addDay()) {
                $dateStr = $d->toDateString();
                if (!isset($existing[$user->id][$dateStr])) {
                    $status = match($leave->type) {
                        'cuti' => \App\Enums\AttendanceStatus::cuti,
                        'sakit' => \App\Enums\AttendanceStatus::sakit,
                        'izin', 'izin_terlambat' => \App\Enums\AttendanceStatus::izin,
                        default => \App\Enums\AttendanceStatus::izin,
                    };

                    $typeLabel = match($leave->type) {
                        'cuti' => 'Cuti',
                        'sakit' => 'Sakit',
                        'izin' => 'Izin',
                        'izin_terlambat' => 'Izin Terlambat',
                        default => ucfirst($leave->type)
                    };

                    $notes = "Pengajuan {$typeLabel} Disetujui" . ($leave->reason ? ": {$leave->reason}" : "");

                    if ($search) {
                        $searchLower = strtolower($search);
                        $matchesName = str_contains(strtolower($user->name ?? ''), $searchLower);
                        $matchesNotes = str_contains(strtolower($notes), $searchLower);
                        $matchesStatus = str_contains(strtolower($status->value), $searchLower) || str_contains(strtolower($status->label()), $searchLower);
                        if (!$matchesName && !$matchesNotes && !$matchesStatus) {
                            continue;
                        }
                    }

                    $virtualAtt = new self();
                    $virtualAtt->id = 0; // Virtual ID
                    $virtualAtt->user_id = $user->id;
                    $virtualAtt->date = $dateStr;
                    $virtualAtt->status = $status;
                    $virtualAtt->verification_status = \App\Enums\VerificationStatus::valid;
                    $virtualAtt->system_notes = $notes;
                    $virtualAtt->setRelation('user', $user);

                    $newAttendances->push($virtualAtt);
                    $existing[$user->id][$dateStr] = true;
                }
            }
        }

        // 2. Injeksi Jadwal Libur Resmi / Shift (Day Off Shifts)
        $q = \App\Models\UserShift::with('user', 'shift')
            ->whereHas('shift', function($query) {
                $query->where('is_dayoff', true);
            })
            ->where('start_date', '<=', $end->toDateString())
            ->where(function($query) use ($start) {
                $query->whereNull('end_date')
                      ->orWhere('end_date', '>=', $start->toDateString());
            });

        if ($userId) {
            $q->where('user_id', $userId);
        }

        $dayOffShifts = $q->get();

        foreach ($dayOffShifts as $us) {
            $user = $us->user;
            if (!$user) continue;

            $usStart = \Carbon\Carbon::parse($us->start_date)->max($start);
            $usEnd = $us->end_date ? \Carbon\Carbon::parse($us->end_date)->min($end) : $end->copy();

            for ($d = $usStart->copy(); $d->lte($usEnd); $d->addDay()) {
                $dateStr = $d->toDateString();
                if (!isset($existing[$user->id][$dateStr])) {
                    $notes = 'Jadwal Libur: ' . $us->shift->name;

                    if ($search) {
                        $searchLower = strtolower($search);
                        $matchesName = str_contains(strtolower($user->name ?? ''), $searchLower);
                        $matchesNotes = str_contains(strtolower($notes), $searchLower);
                        $matchesStatus = str_contains(strtolower(\App\Enums\AttendanceStatus::libur->value), $searchLower) || str_contains(strtolower(\App\Enums\AttendanceStatus::libur->label()), $searchLower);
                        if (!$matchesName && !$matchesNotes && !$matchesStatus) {
                            continue;
                        }
                    }

                    $virtualAtt = new self();
                    $virtualAtt->id = 0; // Virtual ID
                    $virtualAtt->user_id = $user->id;
                    $virtualAtt->date = $dateStr;
                    $virtualAtt->status = \App\Enums\AttendanceStatus::libur;
                    $virtualAtt->verification_status = \App\Enums\VerificationStatus::valid;
                    $virtualAtt->system_notes = $notes;
                    $virtualAtt->setRelation('user', $user);
                    
                    $newAttendances->push($virtualAtt);
                    $existing[$user->id][$dateStr] = true;
                }
            }
        }

        return $attendances->concat($newAttendances)->sortByDesc('date')->values();
    }

    public static function injectDayOffsAndLeaves($attendances, $startDate, $endDate, $userId = null, $search = null)
    {
        return self::injectDayOffs($attendances, $startDate, $endDate, $userId, $search);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function getPhotoUrlAttribute()
    {
        return $this->photo_path ? Storage::url($this->photo_path) : null;
    }

    public function getCheckoutPhotoUrlAttribute()
    {
        return $this->checkout_photo_path ? Storage::url($this->checkout_photo_path) : null;
    }

    /**
     * Durasi keterlambatan dalam format "Xj Ym" (misal: "1j 15m").
     * Null jika bukan status terlambat atau data tidak tersedia.
     */
    /**
     * Helper to resolve the reference shift start time for this attendance record.
     */
    public function resolveShiftStartTime(): ?Carbon
    {
        $user = $this->user;
        $activeShift = $user ? $user->activeShift($this->date) : null;
        $startStr = null;

        if ($activeShift && $activeShift->start_time) {
            $startStr = $activeShift->start_time;
        } elseif ($user) {
            $anyShift = $user->shifts()->where('is_dayoff', false)->whereNotNull('start_time')->first();
            if ($anyShift) {
                $startStr = $anyShift->start_time;
            }
        }

        if (!$startStr) {
            $activeGeofence = \App\Models\Geofence::where('is_active', true)->whereNotNull('work_start_time')->first();
            if ($activeGeofence) {
                $startStr = $activeGeofence->work_start_time;
            }
        }

        if (!$startStr) {
            $defaultShift = \App\Models\Shift::where('is_dayoff', false)->whereNotNull('start_time')->first();
            if ($defaultShift) {
                $startStr = $defaultShift->start_time;
            }
        }

        if (!$startStr) {
            $startStr = '08:00:00';
        }

        try {
            return Carbon::parse($startStr);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Helper to resolve effective end time for this attendance record.
     */
    public function resolveEffectiveEndTime(?Carbon $checkIn = null): ?Carbon
    {
        $user = $this->user;
        $activeShift = $user ? $user->activeShift($this->date) : null;

        if ($activeShift && $activeShift->start_time && $activeShift->end_time) {
            try {
                $shiftStart = Carbon::parse($activeShift->start_time);
                $shiftEnd   = Carbon::parse($activeShift->end_time);
                if ($shiftEnd->lessThan($shiftStart)) {
                    $shiftEnd->addDay();
                }

                if ($checkIn) {
                    $minsEarly = $shiftStart->diffInMinutes($checkIn, false);
                    $earlyToleranceMinutes = (int) \App\Models\Setting::get('early_checkin_tolerance_minutes', 60);
                    if ($minsEarly < 0 && abs($minsEarly) > $earlyToleranceMinutes) {
                        return $checkIn->copy()->addHours(10);
                    }
                }

                return $shiftEnd;
            } catch (\Exception $e) {
                // fallback below
            }
        }

        // Fallback if no active shift or missing end time
        if ($user) {
            $anyShift = $user->shifts()->where('is_dayoff', false)->whereNotNull('end_time')->first();
            if ($anyShift && $anyShift->end_time) {
                try {
                    return Carbon::parse($anyShift->end_time);
                } catch (\Exception $e) {}
            }
        }

        $defaultShift = \App\Models\Shift::where('is_dayoff', false)->whereNotNull('end_time')->first();
        if ($defaultShift && $defaultShift->end_time) {
            try {
                return Carbon::parse($defaultShift->end_time);
            } catch (\Exception $e) {}
        }

        if ($checkIn) {
            return $checkIn->copy()->addHours(10);
        }

        return null;
    }

    /**
     * Durasi keterlambatan dalam format "Xj Ym" (misal: "1j 15m").
     * Muncul jika status terlambat atau kedatangan melebihi batas jam masuk.
     */
    public function getLateDetailsAttribute(): ?array
    {
        if (!$this->check_in) {
            return null;
        }

        try {
            $checkIn = Carbon::parse($this->check_in);
        } catch (\Exception $e) {
            return null;
        }

        $statusVal = $this->status instanceof AttendanceStatus
            ? $this->status->value
            : (string) $this->status;

        $shiftStart = $this->resolveShiftStartTime();
        if (!$shiftStart) {
            return null;
        }

        $lateTolerance = (int) \App\Models\Setting::get('late_tolerance_minutes', 0);
        $effectiveStart = $shiftStart->copy()->addMinutes($lateTolerance);

        // Jika status terlambat, atau jam masuk melebihi toleransi keterlambatan
        $isLate = ($statusVal === 'terlambat') || ($checkIn->greaterThan($effectiveStart) && !in_array($statusVal, ['libur', 'izin', 'sakit', 'alpha', 'cuti']));

        if ($isLate) {
            if ($checkIn->greaterThan($shiftStart)) {
                $diffInMinutes = (int) round(abs($checkIn->diffInMinutes($shiftStart)));
            } else {
                $diffInMinutes = 0;
            }

            $hours = (int) floor($diffInMinutes / 60);
            $minutes = (int) ($diffInMinutes % 60);
            return [
                'hours' => $hours,
                'minutes' => $minutes,
                'text' => ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m",
            ];
        }

        return null;
    }

    /**
     * Durasi lembur dalam format "Xj Ym" (misal: "2j 30m").
     * Muncul jika status lembur atau kepulangan melebihi toleransi lembur setelah jam pulang efektif.
     */
    public function getOvertimeDetailsAttribute(): ?array
    {
        if (!$this->check_in || !$this->check_out) {
            return null;
        }

        try {
            $checkIn = Carbon::parse($this->check_in);
            $checkOut = Carbon::parse($this->check_out);
            if ($checkOut->lessThan($checkIn)) {
                $checkOut->addDay();
            }
        } catch (\Exception $e) {
            return null;
        }

        $statusVal = $this->status instanceof AttendanceStatus
            ? $this->status->value
            : (string) $this->status;

        $effectiveEnd = $this->resolveEffectiveEndTime($checkIn);
        if (!$effectiveEnd) {
            return null;
        }

        $overtimeTolerance = (int) \App\Models\Setting::get('overtime_tolerance_minutes', 60);

        // Muncul jika status lembur, atau kepulangan melebihi batas lembur
        $isOvertime = ($statusVal === 'lembur') || ($checkOut->greaterThan($effectiveEnd->copy()->addMinutes($overtimeTolerance)) && !in_array($statusVal, ['libur', 'izin', 'sakit', 'alpha', 'cuti']));

        if ($isOvertime) {
            $diffInMinutes = (int) round(abs($checkOut->diffInMinutes($effectiveEnd)));
            if ($diffInMinutes <= 0 && $statusVal === 'lembur') {
                $diffInMinutes = 1;
            }

            $hours = (int) floor($diffInMinutes / 60);
            $minutes = (int) ($diffInMinutes % 60);
            return [
                'hours' => $hours,
                'minutes' => $minutes,
                'text' => ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m",
            ];
        }

        return null;
    }

    /**
     * Durasi pulang awal dalam format "Xj Ym" (misal: "1j 30m").
     * Muncul jika status pulang_awal atau kepulangan sebelum jam pulang efektif.
     */
    public function getEarlyLeaveDetailsAttribute(): ?array
    {
        if (!$this->check_in || !$this->check_out) {
            return null;
        }

        try {
            $checkIn  = Carbon::parse($this->check_in);
            $checkOut = Carbon::parse($this->check_out);
            if ($checkOut->lessThan($checkIn)) {
                $checkOut->addDay();
            }
        } catch (\Exception $e) {
            return null;
        }

        $statusVal = $this->status instanceof AttendanceStatus
            ? $this->status->value
            : (string) $this->status;

        $effectiveEnd = $this->resolveEffectiveEndTime($checkIn);
        if (!$effectiveEnd) {
            return null;
        }

        // Muncul jika status pulang_awal, atau kepulangan lebih awal dari 30 menit sebelum jam pulang efektif
        $isEarly = ($statusVal === 'pulang_awal') || ($checkOut->lessThan($effectiveEnd->copy()->subMinutes(30)) && !in_array($statusVal, ['libur', 'izin', 'sakit', 'alpha', 'cuti']));

        if ($isEarly) {
            $diffInMinutes = (int) round(abs($effectiveEnd->diffInMinutes($checkOut)));
            if ($diffInMinutes <= 0 && $statusVal === 'pulang_awal') {
                $diffInMinutes = 1;
            }

            $hours   = (int) floor($diffInMinutes / 60);
            $minutes = (int) ($diffInMinutes % 60);
            return [
                'hours'   => $hours,
                'minutes' => $minutes,
                'text'    => ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m",
            ];
        }

        return null;
    }

    public function getTimeDetailsAttribute(): ?string
    {
        $statusVal = $this->status instanceof AttendanceStatus
            ? $this->status->value
            : (string) $this->status;

        if ($statusVal === 'terlambat') {
            return $this->late_details['text'] ?? null;
        }

        if ($statusVal === 'lembur') {
            return $this->overtime_details['text'] ?? null;
        }

        if ($statusVal === 'pulang_awal') {
            return $this->early_leave_details['text'] ?? null;
        }

        return null;
    }
}
