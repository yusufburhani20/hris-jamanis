<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;
use App\Models\Setting;
use Carbon\Carbon;

$alertTime = '08:00';
try {
    if (Schema::hasTable('settings')) {
        $alertTime = Setting::where('key', 'attendance_alert_time')->value('value') ?? '08:00';
    }
} catch (\Exception $e) {
    // Abaikan jika DB belum terkoneksi atau tabel belum ada (saat composer install awal)
}

Schedule::command('salira:send-absence-alerts')->dailyAt($alertTime);

// ─── PWA Push Notification: Pengingat Absensi Berdasarkan Shift / Default ───
use App\Services\WebPushService;
use App\Models\User as UserModel;

Schedule::call(function () {
    try {
        $currentTime = Carbon::now()->format('H:i');
        
        $employees = UserModel::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->get();

        $push = app(WebPushService::class);
        
        // Default check-in reminder time from settings
        $defaultCheckinReminder = '07:45';
        try {
            if (Schema::hasTable('settings')) {
                $defaultCheckinReminder = Setting::where('key', 'push_checkin_reminder_time')->value('value') ?? '07:45';
            }
        } catch (\Exception $e) {}
        
        $defaultCheckinReminder = Carbon::parse($defaultCheckinReminder)->format('H:i');

        foreach ($employees as $emp) {
            $activeShift = $emp->activeShift();
            if ($activeShift) {
                // Remind 15 minutes before shift starts
                $targetTime = Carbon::parse($activeShift->start_time)->subMinutes(15)->format('H:i');
            } else {
                $targetTime = $defaultCheckinReminder;
            }

            if ($currentTime === $targetTime) {
                $hasCheckedIn = \App\Models\Attendance::where('user_id', $emp->id)
                    ->whereDate('date', today())
                    ->exists();

                if (!$hasCheckedIn) {
                    $push->sendToUser(
                        $emp->id,
                        '🔔 Pengingat Absensi Masuk',
                        'Jangan lupa melakukan check-in kehadiran hari ini!',
                        ['url' => '/attendances/scanner']
                    );
                }
            }
        }
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::warning('Push checkin reminder failed: ' . $e->getMessage());
    }
})->everyMinute();

Schedule::call(function () {
    try {
        $currentTime = Carbon::now()->format('H:i');
        
        $employees = UserModel::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->get();

        $push = app(WebPushService::class);
        
        // Default check-out reminder time from settings
        $defaultCheckoutReminder = '17:00';
        try {
            if (Schema::hasTable('settings')) {
                $defaultCheckoutReminder = Setting::where('key', 'push_checkout_reminder_time')->value('value') ?? '17:00';
            }
        } catch (\Exception $e) {}
        
        $defaultCheckoutReminder = Carbon::parse($defaultCheckoutReminder)->format('H:i');

        foreach ($employees as $emp) {
            $activeShift = $emp->activeShift();
            if ($activeShift) {
                // Remind exactly at shift end
                $targetTime = Carbon::parse($activeShift->end_time)->format('H:i');
            } else {
                $targetTime = $defaultCheckoutReminder;
            }

            if ($currentTime === $targetTime) {
                $attendance = \App\Models\Attendance::where('user_id', $emp->id)
                    ->whereDate('date', today())
                    ->whereNotNull('check_in')
                    ->whereNull('check_out')
                    ->exists();

                if ($attendance) {
                    $push->sendToUser(
                        $emp->id,
                        '🌙 Pengingat Absensi Pulang',
                        'Sudah waktunya pulang! Jangan lupa melakukan check-out.',
                        ['url' => '/attendances/scanner']
                    );
                }
            }
        }
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::warning('Push checkout reminder failed: ' . $e->getMessage());
    }
})->everyMinute();

use App\Models\User;
use App\Models\Payroll;

Schedule::call(function () {
    // Check if auto payroll is enabled
    $autoEnabled = Setting::get('payroll_auto_calculate_enabled', '0') === '1';
    if (!$autoEnabled) {
        return;
    }

    $executionDay = intval(Setting::get('payroll_auto_calculate_day', '26'));
    $today = Carbon::today();

    if ($today->day !== $executionDay) {
        return;
    }

    // Run automatic calculation
    $startDay = intval(Setting::get('payroll_period_start_day', '26'));
    $endDay = intval(Setting::get('payroll_period_end_day', '25'));

    $targetMonth = $today->month;
    $targetYear = $today->year;

    // Build start date
    if ($startDay === 1) {
        $startDate = Carbon::create($targetYear, $targetMonth, 1);
    } else {
        $startDate = Carbon::create($targetYear, $targetMonth, 1)->subMonth()->day($startDay);
    }
    
    // End date
    $endDate = Carbon::create($targetYear, $targetMonth, 1)->day($endDay);

    // Fetch all active employees
    $employees = User::where('role', 'LIKE', '%employee%')
        ->orWhere('role', 'LIKE', '%driver%')
        ->get();

    foreach ($employees as $employee) {
        try {
            Payroll::calculateForUser($employee->id, $targetMonth, $targetYear, $startDate, $endDate);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Auto payroll calculation failed for User ID {$employee->id}: " . $e->getMessage());
        }
    }
})->dailyAt('01:00');
