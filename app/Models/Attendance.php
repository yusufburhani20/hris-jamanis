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
        'is_mocked' => 'boolean',
    ];
    
    protected $appends = ['photo_url', 'checkout_photo_url', 'time_details'];

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
                    if ($checkIn->greaterThan($shiftStart)) {
                        $diffInMinutes = $checkIn->diffInMinutes($shiftStart);
                        $hours = floor($diffInMinutes / 60);
                        $minutes = $diffInMinutes % 60;
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
                    if ($minsEarly < 0 && abs($minsEarly) < 60) {
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
                    $hours = floor($diffInMinutes / 60);
                    $minutes = $diffInMinutes % 60;
                    return ($hours > 0 ? "{$hours}j " : "") . "{$minutes}m";
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
