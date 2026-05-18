<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;
use App\Models\Setting;

$alertTime = '08:00';
try {
    if (Schema::hasTable('settings')) {
        $alertTime = Setting::where('key', 'attendance_alert_time')->value('value') ?? '08:00';
    }
} catch (\Exception $e) {
    // Abaikan jika DB belum terkoneksi atau tabel belum ada (saat composer install awal)
}

Schedule::command('salira:send-absence-alerts')->dailyAt($alertTime);
