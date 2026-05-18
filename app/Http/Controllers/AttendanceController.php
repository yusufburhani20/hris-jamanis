<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Geofence;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Enums\AttendanceStatus;
use App\Enums\VerificationStatus;
use Illuminate\Support\Facades\Auth;

class AttendanceController extends Controller
{
    private function getDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earth_radius = 6371000; // Radius of Earth in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * asin(sqrt($a));
        return $earth_radius * $c;
    }

    private function verifyGeofence($lat, $lon)
    {
        $geofences = Geofence::where('is_active', true)->get();
        if ($geofences->isEmpty()) {
            return ['valid' => true, 'notes' => 'No active geofences configured', 'geofence' => null];
        }

        foreach ($geofences as $geofence) {
            $dist = $this->getDistance($lat, $lon, $geofence->latitude, $geofence->longitude);
            if ($dist <= $geofence->radius) {
                return [
                    'valid' => true, 
                    'notes' => "Inside " . $geofence->name . " (Distance: " . round($dist) . "m)",
                    'geofence' => $geofence
                ];
            }
        }

        return ['valid' => false, 'notes' => 'Outside all geofence zones', 'geofence' => null];
    }

    public function checkIn(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'photo' => 'required|image|max:2048', // Max 2MB
            'is_mocked' => 'nullable|boolean',
        ]);

        // Strict Spoofing Check
        $isMocked = $request->boolean('is_mocked', false);
        if ($isMocked) {
            return back()->with('error', 'Gagal Presensi: Terdeteksi penggunaan lokasi palsu (Fake GPS / Spoofing)! Harap matikan aplikasi mock location Anda.');
        }

        $user = Auth::user();
        $date = Carbon::today();

        // Check if already checked in today
        $existing = Attendance::where('user_id', $user->id)
            ->where('date', $date)
            ->first();

        if ($existing && $existing->check_in) {
            return back()->with('error', 'Anda sudah melakukan presensi masuk hari ini.');
        }

        $geoCheck = $this->verifyGeofence($request->latitude, $request->longitude);
        if (!$geoCheck['valid']) {
            return back()->with('error', 'Gagal Check-In: Anda berada di luar radius lokasi yang diizinkan.');
        }

        $status = 'hadir';
        $now = Carbon::now();
        
        // ── SHIFT PENUGASAN INTEGRATION (PHASE 1) ──
        $activeShift = $user->activeShift();
        if ($activeShift) {
            $startTime = Carbon::createFromFormat('H:i:s', $activeShift->start_time);
            if ($now->greaterThan($startTime)) {
                $status = 'terlambat';
            }
        } elseif ($geoCheck['geofence'] && $geoCheck['geofence']->work_start_time) {
            $startTime = Carbon::createFromFormat('H:i:s', $geoCheck['geofence']->work_start_time);
            if ($now->greaterThan($startTime)) {
                $status = 'terlambat';
            }
        }

        $verificationStatus = $geoCheck['valid'] ? 'valid' : 'system_flagged';
        $notes = $geoCheck['notes'];

        $path = $request->file('photo')->store('attendances/checkin', 'public');

        Attendance::updateOrCreate(
            ['user_id' => $user->id, 'date' => $date],
            [
                'check_in' => Carbon::now()->format('H:i:s'),
                'status' => $status,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'photo_path' => $path,
                'ip_address' => $request->ip(),
                'device_id' => $request->header('User-Agent'),
                'verification_status' => $verificationStatus,
                'system_notes' => $notes,
                'is_mocked' => false,
            ]
        );

        return back()->with('success', 'Presensi masuk berhasil.');
    }

    public function checkOut(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'photo' => 'nullable|image|max:2048',
            'is_mocked' => 'nullable|boolean',
        ]);

        // Strict Spoofing Check
        $isMocked = $request->boolean('is_mocked', false);
        if ($isMocked) {
            return back()->with('error', 'Gagal Presensi: Terdeteksi penggunaan lokasi palsu (Fake GPS / Spoofing)! Harap matikan aplikasi mock location Anda.');
        }

        $user = Auth::user();
        $date = Carbon::today();

        $existing = Attendance::where('user_id', $user->id)
            ->where('date', $date)
            ->first();

        if (!$existing || !$existing->check_in) {
            return back()->with('error', 'Anda harus melakukan presensi masuk terlebih dahulu.');
        }

        if ($existing->check_out) {
            return back()->with('error', 'Anda sudah melakukan presensi pulang hari ini.');
        }

        $geoCheck = $this->verifyGeofence($request->latitude, $request->longitude);
        if (!$geoCheck['valid']) {
            return back()->with('error', 'Gagal Check-Out: Anda berada di luar radius lokasi yang diizinkan.');
        }

        $now = Carbon::now();
        $notes = $existing->system_notes . " | CheckOut: " . $geoCheck['notes'];
        $newStatus = $existing->status;
        
        // ── SHIFT PENUGASAN INTEGRATION (PHASE 1) ──
        $activeShift = $user->activeShift();
        if ($activeShift) {
            $endTime = Carbon::createFromFormat('H:i:s', $activeShift->end_time);
            if ($now->greaterThan($endTime)) {
                $notes .= " (Lembur)";
                $newStatus = 'lembur';
            } elseif ($now->lessThan($endTime)) {
                $notes .= " (Pulang Lebih Awal)";
                $newStatus = 'pulang_awal';
            }
        } elseif ($geoCheck['geofence'] && $geoCheck['geofence']->work_end_time) {
            $endTime = Carbon::createFromFormat('H:i:s', $geoCheck['geofence']->work_end_time);
            if ($now->greaterThan($endTime)) {
                $notes .= " (Lembur)";
                $newStatus = 'lembur';
            } elseif ($now->lessThan($endTime)) {
                $notes .= " (Pulang Lebih Awal)";
                $newStatus = 'pulang_awal';
            }
        }

        $prevValid = is_string($existing->verification_status) 
            ? $existing->verification_status === 'valid' 
            : $existing->verification_status->value === 'valid';

        $verificationStatus = ($geoCheck['valid'] && $prevValid) ? 'valid' : 'system_flagged';
        
        $checkoutPath = null;
        if ($request->hasFile('photo')) {
            $checkoutPath = $request->file('photo')->store('attendances/checkout', 'public');
        }

        $existing->update([
            'check_out' => Carbon::now()->format('H:i:s'),
            'status' => $newStatus,
            'system_notes' => $notes,
            'verification_status' => $verificationStatus,
            'checkout_photo_path' => $checkoutPath,
            'is_mocked' => false,
        ]);

        return back()->with('success', 'Presensi pulang berhasil.');
    }
}
