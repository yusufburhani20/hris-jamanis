<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Geofence;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Enums\AttendanceStatus;
use App\Enums\VerificationStatus;
use Illuminate\Support\Facades\Auth;
use App\Models\Setting;

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
            'photo' => 'required_without:photo_base64|image|max:2048', // Max 2MB
            'photo_base64' => 'required_without:photo|string',
            'is_mocked' => 'nullable|boolean',
            'offline_device_time' => 'nullable|string',
            'accuracy' => 'nullable|numeric',
        ]);

        // Strict Spoofing Check
        $isMocked = $request->boolean('is_mocked', false);
        if ($isMocked) {
            return back()->with('error', 'Gagal Presensi: Terdeteksi penggunaan lokasi palsu (Fake GPS / Spoofing)! Harap matikan aplikasi mock location Anda.');
        }

        $user = Auth::user();
        $offlineDeviceTime = $request->input('offline_device_time');
        $isOffline = !empty($offlineDeviceTime);
        $deviceTime = $isOffline ? Carbon::parse($offlineDeviceTime) : Carbon::now();
        $date = $isOffline ? $deviceTime->toDateString() : Carbon::today()->toDateString();

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

        // ── SHIFT PENUGASAN INTEGRATION (PHASE 1) ──
        $activeShift = $user->activeShift($date);
        $lateToleranceMinutes = (int) Setting::get('late_tolerance_minutes', 0);
        if ($activeShift) {
            $startTime = Carbon::createFromFormat('H:i:s', $activeShift->start_time);
            if ($deviceTime->greaterThan($startTime->copy()->addMinutes($lateToleranceMinutes))) {
                $status = 'terlambat';
            }
        } elseif ($geoCheck['geofence'] && $geoCheck['geofence']->work_start_time) {
            $startTime = Carbon::createFromFormat('H:i:s', $geoCheck['geofence']->work_start_time);
            if ($deviceTime->greaterThan($startTime->copy()->addMinutes($lateToleranceMinutes))) {
                $status = 'terlambat';
            }
        }

        $verificationStatus = $geoCheck['valid'] ? 'valid' : 'system_flagged';
        $notes = $geoCheck['notes'];

        $path = null;
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('attendances/checkin', 'public');
        } elseif ($request->filled('photo_base64')) {
            $base64Data = $request->input('photo_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
                $ext = strtolower($type[1]);
            } else {
                $ext = 'png';
            }
            $image = base64_decode($base64Data);
            if ($image === false) {
                return back()->with('error', 'Gagal memproses foto selfie.');
            }
            $filename = 'offline_' . uniqid() . '.' . $ext;
            $path = 'attendances/checkin/' . $filename;
            \Illuminate\Support\Facades\Storage::disk('public')->put($path, $image);
        }

        Attendance::updateOrCreate(
            ['user_id' => $user->id, 'date' => $date],
            [
                'check_in' => $deviceTime->format('H:i:s'),
                'status' => $status,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'accuracy' => $request->input('accuracy'),
                'photo_path' => $path,
                'ip_address' => $request->ip(),
                'device_id' => $request->header('User-Agent'),
                'verification_status' => $verificationStatus,
                'system_notes' => $notes,
                'is_mocked' => false,
                'is_offline' => $isOffline,
                'offline_device_time' => $isOffline ? $deviceTime->toDateTimeString() : null,
            ]
        );

        // Push notification to admins
        if (Setting::get('notif_admin_checkin_enabled', '1') === '1') {
            try {
                $statusLabel = match($status) {
                    'hadir' => 'Hadir',
                    'terlambat' => 'Terlambat',
                    default => ucfirst($status)
                };
                app(\App\Services\WebPushService::class)->sendToAdmins(
                    '📢 Absen Masuk Baru',
                    "{$user->name} baru saja melakukan absensi masuk pada jam {$deviceTime->format('H:i:s')} (Status: {$statusLabel}).",
                    ['url' => '/admin/attendances']
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Push notif to admins (check-in) failed: ' . $e->getMessage());
            }
        }

        return back()->with('success', 'Presensi masuk berhasil.');
    }

    public function checkOut(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'photo' => 'nullable|image|max:2048',
            'photo_base64' => 'nullable|string',
            'is_mocked' => 'nullable|boolean',
            'offline_device_time' => 'nullable|string',
            'accuracy' => 'nullable|numeric',
        ]);

        // Strict Spoofing Check
        $isMocked = $request->boolean('is_mocked', false);
        if ($isMocked) {
            return back()->with('error', 'Gagal Presensi: Terdeteksi penggunaan lokasi palsu (Fake GPS / Spoofing)! Harap matikan aplikasi mock location Anda.');
        }

        $user = Auth::user();
        $offlineDeviceTime = $request->input('offline_device_time');
        $isOffline = !empty($offlineDeviceTime);
        $deviceTime = $isOffline ? Carbon::parse($offlineDeviceTime) : Carbon::now();
        $date = $isOffline ? $deviceTime->toDateString() : Carbon::today()->toDateString();

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

        $notes = $existing->system_notes . " | CheckOut: " . $geoCheck['notes'];
        $newStatus = $existing->status;

        // ── EARLY CHECK-IN RULE + SHIFT INTEGRATION ──
        // Toleransi early check-in: jika masuk ≤ early check-in tolerance menit sebelum shift,
        // jam kerja dihitung dari check-in nyata (10 jam ke depan).
        $earlyToleranceMinutes = (int) Setting::get('early_checkin_tolerance_minutes', 60);
        $activeShift = $user->activeShift($date);
        $checkInTime = Carbon::createFromFormat('H:i:s', $existing->check_in);

        if ($activeShift) {
            $shiftStart  = Carbon::createFromFormat('H:i:s', $activeShift->start_time);
            $shiftEnd    = Carbon::createFromFormat('H:i:s', $activeShift->end_time);
            $minsEarly   = $shiftStart->diffInMinutes($checkInTime, false); // negatif jika lebih awal

            // Early check-in dalam toleransi → effective end = check_in + 10 jam
            if ($minsEarly < 0 && abs($minsEarly) <= $earlyToleranceMinutes) {
                $effectiveEnd = $checkInTime->copy()->addHours(10);
                $notes .= " (Masuk Awal, EffEnd: " . $effectiveEnd->format('H:i') . ")";
            } else {
                $effectiveEnd = $shiftEnd;
            }
        } else {
            // Tidak ada shift → selalu check_in + 10 jam
            $effectiveEnd = $checkInTime->copy()->addHours(10);
            $notes .= " (No Shift, EffEnd: " . $effectiveEnd->format('H:i') . ")";
        }

        if ($deviceTime->greaterThan($effectiveEnd->copy()->addMinutes(60))) {
            $notes .= " (Lembur)";
            $newStatus = 'lembur';
        } elseif ($deviceTime->lessThan($effectiveEnd->copy()->subMinutes(30))) {
            // Toleransi pulang awal: lebih dari 30 menit sebelum effective end
            $notes .= " (Pulang Lebih Awal)";
            $newStatus = 'pulang_awal';
        }

        $prevValid = is_string($existing->verification_status)
            ? $existing->verification_status === 'valid'
            : $existing->verification_status->value === 'valid';

        $verificationStatus = ($geoCheck['valid'] && $prevValid) ? 'valid' : 'system_flagged';

        $checkoutPath = null;
        if ($request->hasFile('photo')) {
            $checkoutPath = $request->file('photo')->store('attendances/checkout', 'public');
        } elseif ($request->filled('photo_base64')) {
            $base64Data = $request->input('photo_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
                $ext = strtolower($type[1]);
            } else {
                $ext = 'png';
            }
            $image = base64_decode($base64Data);
            if ($image !== false) {
                $filename = 'offline_' . uniqid() . '.' . $ext;
                $path = 'attendances/checkout/' . $filename;
                \Illuminate\Support\Facades\Storage::disk('public')->put($path, $image);
                $checkoutPath = $path;
            }
        }

        $existing->update([
            'check_out' => $deviceTime->format('H:i:s'),
            'status' => $newStatus,
            'system_notes' => $notes,
            'verification_status' => $verificationStatus,
            'checkout_photo_path' => $checkoutPath,
            'checkout_accuracy' => $request->input('accuracy'),
            'is_mocked' => false,
            'is_offline' => $existing->is_offline || $isOffline,
            'offline_device_time' => $isOffline ? $deviceTime->toDateTimeString() : $existing->offline_device_time,
        ]);

        // Push notification to admins
        if (Setting::get('notif_admin_checkout_enabled', '1') === '1') {
            try {
                $statusLabel = match($newStatus) {
                    'hadir' => 'Hadir',
                    'terlambat' => 'Terlambat',
                    'lembur' => 'Lembur',
                    'pulang_awal' => 'Pulang Lebih Awal',
                    default => ucfirst($newStatus)
                };
                app(\App\Services\WebPushService::class)->sendToAdmins(
                    '📢 Absen Pulang Baru',
                    "{$user->name} baru saja melakukan absensi pulang pada jam {$deviceTime->format('H:i:s')} (Status: {$statusLabel}).",
                    ['url' => '/admin/attendances']
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Push notif to admins (check-out) failed: ' . $e->getMessage());
            }
        }

        return back()->with('success', 'Presensi pulang berhasil.');
    }

    public function history(Request $request)
    {
        $user = Auth::user();
        $query = Attendance::where('user_id', $user->id);

        if ($request->has(['start_date', 'end_date']) && $request->start_date && $request->end_date) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        $attendances = $query->latest('date')->latest('check_in')->get();

        return \Inertia\Inertia::render('User/Attendances/History', [
            'attendances' => $attendances,
            'filters' => $request->only(['start_date', 'end_date'])
        ]);
    }
}
