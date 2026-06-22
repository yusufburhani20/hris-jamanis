<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Geofence;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $today = Carbon::today();

        if ($user->isAdmin()) {
            // --- ADMIN DASHBOARD ---
            $totalEmployees = User::where('role', 'LIKE', '%employee%')
                ->orWhere('role', 'LIKE', '%driver%')
                ->count();
            $totalGeofences = Geofence::where('is_active', true)->count();
            
            $todayAttendances = Attendance::whereDate('date', $today)->get();
            
            $presentToday = $todayAttendances->where('status', 'hadir')->count();
            $lateToday = $todayAttendances->where('status', 'terlambat')->count();
            $checkoutToday = $todayAttendances->whereNotNull('check_out')->count();

            // Active users online (session last active within 5 mins)
            $activeUsers = User::whereHas('sessions', function($q) {
                $q->where('last_activity', '>=', now()->subMinutes(5)->getTimestamp());
            })->select('id', 'name', 'email', 'avatar', 'role')->get();

            // Recent logins
            $lastLogins = User::whereNotNull('last_login_at')
                ->latest('last_login_at')
                ->select('id', 'name', 'email', 'avatar', 'role', 'last_login_at')
                ->limit(5)->get()
                ->map(function($u) {
                    $u->time_ago = $u->last_login_at->diffForHumans();
                    return $u;
                });

            // Feed of today's attendance
            $todayLogs = Attendance::whereDate('date', $today)
                ->with('user:id,name,email,avatar')
                ->latest('updated_at')
                ->get();

            // FASE 4: 1. Tren Kehadiran Harian (Last 7 Days)
            $attendanceTrend = [];
            for ($i = 6; $i >= 0; $i--) {
                $targetDate = Carbon::today()->subDays($i);
                $records = Attendance::whereDate('date', $targetDate)->get();
                $attendanceTrend[] = [
                    'date' => $targetDate->translatedFormat('d M'),
                    'hadir' => $records->whereIn('status', ['hadir', 'lembur', 'pulang_awal'])->count(),
                    'terlambat' => $records->where('status', 'terlambat')->count(),
                ];
            }

            // FASE 4: 2. Distribusi Status Kehadiran Hari Ini (Pie Chart)
            $present = $todayAttendances->whereIn('status', ['hadir', 'lembur', 'pulang_awal'])->count();
            $late = $todayAttendances->where('status', 'terlambat')->count();
            $absent = max(0, $totalEmployees - $present - $late);
            
            $todayDistribution = [
                ['name' => 'Tepat Waktu', 'value' => $present, 'color' => '#10b981'],
                ['name' => 'Terlambat', 'value' => $late, 'color' => '#f59e0b'],
                ['name' => 'Absen / Bolos', 'value' => $absent, 'color' => '#ef4444'],
            ];

            // FASE 4: 3. Rata-rata Durasi Kerja Efektif Karyawan (Bar Chart)
            $averageWorkHours = [];
            $activeEmployees = User::where('role', 'LIKE', '%employee%')
                ->orWhere('role', 'LIKE', '%driver%')
                ->limit(5)->get();
            foreach ($activeEmployees as $emp) {
                $empAttendances = Attendance::where('user_id', $emp->id)
                    ->whereNotNull('check_in')
                    ->whereNotNull('check_out')
                    ->limit(10)
                    ->get();
                
                $totalHours = 0;
                $count = 0;
                foreach ($empAttendances as $att) {
                    try {
                        $in = Carbon::createFromFormat('H:i:s', $att->check_in);
                        $out = Carbon::createFromFormat('H:i:s', $att->check_out);
                        $totalHours += $out->diffInMinutes($in) / 60;
                        $count++;
                    } catch (\Exception $e) {
                        // ignore parsing error
                    }
                }
                
                $avg = $count > 0 ? round($totalHours / $count, 1) : 0;
                
                $averageWorkHours[] = [
                    'name' => $emp->name,
                    'hours' => $avg,
                ];
            }

            return Inertia::render('Dashboard', [
                'role' => 'admin',
                'stats' => [
                    'total_employees' => $totalEmployees,
                    'total_geofences' => $totalGeofences,
                    'present_today' => $presentToday,
                    'late_today' => $lateToday,
                    'checkout_today' => $checkoutToday,
                ],
                'activeUsers' => $activeUsers,
                'lastLogins' => $lastLogins,
                'todayLogs' => $todayLogs,
                'analytics' => [
                    'attendanceTrend' => $attendanceTrend,
                    'todayDistribution' => $todayDistribution,
                    'averageWorkHours' => $averageWorkHours,
                ]
            ]);
        } else {
            // --- EMPLOYEE DASHBOARD ---
            $todayAttendance = Attendance::where('user_id', $user->id)
                ->whereDate('date', $today)
                ->first();

            $activeGeofences = Geofence::where('is_active', true)
                ->select('id', 'name', 'latitude', 'longitude', 'radius', 'work_start_time', 'work_end_time')
                ->get();

            // Last 5 attendances of this employee
            $recentAttendances = Attendance::where('user_id', $user->id)
                ->latest('date')
                ->limit(5)
                ->get();

            // Shift aktif hari ini
            $activeShift = $user->activeShift();

            return Inertia::render('Dashboard', [
                'role' => 'employee',
                'todayAttendance' => $todayAttendance,
                'geofences' => $activeGeofences,
                'recentAttendances' => $recentAttendances,
                'activeShift' => $activeShift,
            ]);
        }
    }
}
