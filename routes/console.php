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
