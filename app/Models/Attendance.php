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


    public static function injectDayOffs($attendances, $startDate, $endDate, $userId = null)
    {
        $start = \Carbon\Carbon::parse($startDate);
        $end = \Carbon\Carbon::parse($endDate);

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

        $existing = [];
        foreach ($attendances as $att) {
            $dateStr = $att->date instanceof \Carbon\Carbon ? $att->date->toDateString() : (string) $att->date;
            $existing[$att->user_id][$dateStr] = true;
        }

        $newAttendances = collect();

        foreach ($dayOffShifts as $us) {
            $user = $us->user;
            if (!$user) continue;

            $usStart = \Carbon\Carbon::parse($us->start_date)->max($start);
            $usEnd = $us->end_date ? \Carbon\Carbon::parse($us->end_date)->min($end) : $end->copy();

            for ($d = $usStart->copy(); $d->lte($usEnd); $d->addDay()) {
                $dateStr = $d->toDateString();
                if (!isset($existing[$user->id][$dateStr])) {
                    $virtualAtt = new self();
                    $virtualAtt->id = 0; // Virtual ID
                    $virtualAtt->user_id = $user->id;
                    $virtualAtt->date = $dateStr;
                    $virtualAtt->status = \App\Enums\AttendanceStatus::libur;
                    $virtualAtt->system_notes = 'Jadwal Libur: ' . $us->shift->name;
                    $virtualAtt->setRelation('user', $user);
                    
                    $newAttendances->push($virtualAtt);
                    $existing[$user->id][$dateStr] = true;
                }
            }
        }

        return $attendances->concat($newAttendances)->sortByDesc('date')->values();
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
    public function getLateDetailsAttribute(): ?array
    {
        $statusVal = $this->status instanceof AttendanceStatus
            ? $this->status->value
            : $this->status;

        if ($statusVal !== 'terlambat') {
            return null;
        }

        if (!$this->check_in) {
            return null;
        }

        try {
            $checkIn = Carbon::createFromFormat('H:i:s', $this->check_in);
        } catch (\Exception $e) {
            return null;
        }

        $user = $this->user;
        if (!$user) return null;

        $activeShift = $user->activeShift($this->date);
        $startStr = null;
        if ($activeShift) {
            $startStr = $activeShift->start_time;
        } else {
            $activeGeofence = \App\Models\Geofence::where('is_active', true)->whereNotNull('work_start_time')->first();
            if ($activeGeofence) {
                $startStr = $activeGeofence->work_start_time;
            }
        }

        if ($startStr) {
            try {
                $shiftStart = Carbon::createFromFormat('H:i:s', $startStr);
                $lateTolerance = (int) \App\Models\Setting::get('late_tolerance_minutes', 0);
                $effectiveStart = $shiftStart->copy()->addMinutes($lateTolerance);

                if ($checkIn->greaterThan($effectiveStart)) {
                    $diffInMinutes = $effectiveStart->diffInMinutes($checkIn);
                    $hours = (int) floor($diffInMinutes / 60);
                    $minutes = (int) ($diffInMinutes % 60);
                    return [
                        'hours' => $hours,
                        'minutes' => $minutes,
                        'text' => ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m",
                    ];
                }
            } catch (\Exception $e) {
                return null;
            }
        }

        return null;
    }

    /**
     * Durasi lembur dalam format "Xj Ym" (misal: "2j 30m").
     * Null jika bukan status lembur atau data tidak tersedia.
     */
    public function getOvertimeDetailsAttribute(): ?array
    {
        $statusVal = $this->status instanceof AttendanceStatus
            ? $this->status->value
            : $this->status;

        if ($statusVal !== 'lembur') {
            return null;
        }

        if (!$this->check_in || !$this->check_out) {
            return null;
        }

        try {
            $checkIn = Carbon::createFromFormat('H:i:s', $this->check_in);
            $checkOut = Carbon::createFromFormat('H:i:s', $this->check_out);
        } catch (\Exception $e) {
            return null;
        }

        $user = $this->user;
        if (!$user) return null;

        $activeShift = $user->activeShift($this->date);
        if ($activeShift) {
            try {
                $shiftStart = Carbon::createFromFormat('H:i:s', $activeShift->start_time);
                $shiftEnd = Carbon::createFromFormat('H:i:s', $activeShift->end_time);
                $minsEarly = $shiftStart->diffInMinutes($checkIn, false);
                $earlyToleranceMinutes = (int) \App\Models\Setting::get('early_checkin_tolerance_minutes', 60);
                if ($minsEarly < 0 && abs($minsEarly) <= $earlyToleranceMinutes) {
                    $effectiveEnd = $checkIn->copy()->addHours(10);
                } else {
                    $effectiveEnd = $shiftEnd;
                }
            } catch (\Exception $e) {
                $effectiveEnd = $checkIn->copy()->addHours(10);
            }
        } else {
            $effectiveEnd = $checkIn->copy()->addHours(10);
        }

        if ($checkOut->greaterThan($effectiveEnd)) {
            $diffInMinutes = $checkOut->diffInMinutes($effectiveEnd);
            $overtimeTolerance = (int) \App\Models\Setting::get('overtime_tolerance_minutes', 60);
            if ($diffInMinutes >= $overtimeTolerance) {
                $hours = (int) floor($diffInMinutes / 60);
                $minutes = $diffInMinutes % 60;
                return [
                    'hours' => $hours,
                    'minutes' => $minutes,
                    'text' => ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m",
                ];
            }
        }

        return null;
    }

    /**
     * Durasi pulang awal dalam format "Xj Ym" (misal: "1j 30m").
     * Null jika bukan status pulang_awal atau data tidak tersedia.
     */
    public function getEarlyLeaveDetailsAttribute(): ?array
    {
        $statusVal = $this->status instanceof AttendanceStatus
            ? $this->status->value
            : $this->status;

        if ($statusVal !== 'pulang_awal') {
            return null;
        }

        if (!$this->check_in || !$this->check_out) {
            return null;
        }

        try {
            $checkIn  = Carbon::createFromFormat('H:i:s', $this->check_in);
            $checkOut = Carbon::createFromFormat('H:i:s', $this->check_out);
        } catch (\Exception $e) {
            return null;
        }

        $user = $this->user;
        if (!$user) return null;

        $activeShift = $user->activeShift($this->date);
        if ($activeShift) {
            try {
                $shiftStart = Carbon::createFromFormat('H:i:s', $activeShift->start_time);
                $shiftEnd   = Carbon::createFromFormat('H:i:s', $activeShift->end_time);
                // Jika check-in sangat awal (≤ early check-in tolerance menit sebelum shift), gunakan durasi tetap 10 jam
                $minsEarly = $shiftStart->diffInMinutes($checkIn, false);
                $earlyToleranceMinutes = (int) \App\Models\Setting::get('early_checkin_tolerance_minutes', 60);
                if ($minsEarly < 0 && abs($minsEarly) <= $earlyToleranceMinutes) {
                    $effectiveEnd = $checkIn->copy()->addHours(10);
                } else {
                    $effectiveEnd = $shiftEnd;
                }
            } catch (\Exception $e) {
                $effectiveEnd = $checkIn->copy()->addHours(10);
            }
        } else {
            $effectiveEnd = $checkIn->copy()->addHours(10);
        }

        if ($checkOut->lessThan($effectiveEnd)) {
            $diffInMinutes = $checkOut->diffInMinutes($effectiveEnd);
            $hours   = (int) floor($diffInMinutes / 60);
            $minutes = $diffInMinutes % 60;
            return [
                'hours'   => $hours,
                'minutes' => $minutes,
                'text'    => ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m",
            ];
        }

        return null;
    }

    public function getTimeDetailsAttribute()
    {
        $user = $this->user;
        if (!$user) {
            return null;
        }

        $statusVal = $this->status instanceof \App\Enums\AttendanceStatus 
            ? $this->status->value 
            : $this->status;

        if (!in_array($statusVal, ['terlambat', 'pulang_awal', 'lembur'])) {
            return null;
        }

        if (!$this->check_in) {
            return null;
        }

        try {
            $checkIn = Carbon::createFromFormat('H:i:s', $this->check_in);
        } catch (\Exception $e) {
            return null;
        }

        if ($statusVal === 'terlambat') {
            $activeShift = $user->activeShift($this->date);
            $startStr = null;
            if ($activeShift) {
                $startStr = $activeShift->start_time;
            } else {
                $activeGeofence = \App\Models\Geofence::where('is_active', true)->whereNotNull('work_start_time')->first();
                if ($activeGeofence) {
                    $startStr = $activeGeofence->work_start_time;
                }
            }

            if ($startStr) {
                try {
                    $shiftStart = Carbon::createFromFormat('H:i:s', $startStr);
                    $lateTolerance = (int) \App\Models\Setting::get('late_tolerance_minutes', 0);
                    $effectiveStart = $shiftStart->copy()->addMinutes($lateTolerance);

                    if ($checkIn->greaterThan($effectiveStart)) {
                        $diffInMinutes = $effectiveStart->diffInMinutes($checkIn);
                        $hours = (int) floor($diffInMinutes / 60);
                        $minutes = (int) ($diffInMinutes % 60);
                        return ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m";
                    }
                } catch (\Exception $e) {
                    return null;
                }
            }
        }

        if (in_array($statusVal, ['lembur', 'pulang_awal'])) {
            if (!$this->check_out) {
                return null;
            }

            try {
                $checkOut = Carbon::createFromFormat('H:i:s', $this->check_out);
            } catch (\Exception $e) {
                return null;
            }

            $activeShift = $user->activeShift($this->date);
            if ($activeShift) {
                try {
                    $shiftStart = Carbon::createFromFormat('H:i:s', $activeShift->start_time);
                    $shiftEnd = Carbon::createFromFormat('H:i:s', $activeShift->end_time);
                    $minsEarly = $shiftStart->diffInMinutes($checkIn, false); // negative if earlier
                    $earlyToleranceMinutes = (int) \App\Models\Setting::get('early_checkin_tolerance_minutes', 60);
                    if ($minsEarly < 0 && abs($minsEarly) <= $earlyToleranceMinutes) {
                        $effectiveEnd = $checkIn->copy()->addHours(10);
                    } else {
                        $effectiveEnd = $shiftEnd;
                    }
                } catch (\Exception $e) {
                    $effectiveEnd = $checkIn->copy()->addHours(10);
                }
            } else {
                $effectiveEnd = $checkIn->copy()->addHours(10);
            }

            if ($statusVal === 'lembur') {
                if ($checkOut->greaterThan($effectiveEnd)) {
                    $diffInMinutes = $checkOut->diffInMinutes($effectiveEnd);
                    $overtimeTolerance = (int) \App\Models\Setting::get('overtime_tolerance_minutes', 60);
                    if ($diffInMinutes >= $overtimeTolerance) {
                        $hours = floor($diffInMinutes / 60);
                        $minutes = $diffInMinutes % 60;
                        return ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m";
                    }
                }
            } elseif ($statusVal === 'pulang_awal') {
                if ($checkOut->lessThan($effectiveEnd)) {
                    $diffInMinutes = $checkOut->diffInMinutes($effectiveEnd);
                    $hours = floor($diffInMinutes / 60);
                    $minutes = $diffInMinutes % 60;
                    return ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m";
                }
            }
        }

        return null;
    }
}
