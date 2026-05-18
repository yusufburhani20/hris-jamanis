<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\Setting;
use App\Notifications\StudentAbsenceAlert;
use Carbon\Carbon;

class SendAbsenceAlerts extends Command
{
    protected $signature = 'salira:send-absence-alerts';
    protected $description = 'Kirim notifikasi otomatis ke wali jika siswa belum tap kehadiran hingga jam batas.';

    public function handle()
    {
        $isEnabled = Setting::where('key', 'attendance_alert_enabled')->value('value') === '1';
        if (!$isEnabled) {
            $this->info('Fitur notifikasi absensi otomatis sedang dinonaktifkan.');
            return;
        }

        $today = Carbon::today()->toDateString();

        // 1. Ambil semua siswa AKTIF
        $students = Student::where('status', 'active')->get();

        $count = 0;
        foreach ($students as $student) {
            // 2. Cek apakah sudah ada record absensi hari ini
            $hasAttendance = StudentAttendance::where('student_id', $student->id)
                ->whereDate('date', $today)
                ->exists();

            if (!$hasAttendance) {
                // 3. Kirim notifikasi langsung ke siswa (channel Telegram/WA/DB)
                $student->notify(new StudentAbsenceAlert($student, $today));
                $count++;
            }
        }

        $this->info("Berhasil mengirim notifikasi ke wali dari {$count} siswa yang belum hadir.");
    }
}
