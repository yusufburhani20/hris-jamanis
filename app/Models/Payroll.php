<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Models\User;
use App\Models\Attendance;
use App\Models\Leave;
use App\Models\Setting;
use App\Models\OvertimeRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class Payroll extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'paid_at'                 => 'datetime',
        'month'                   => 'integer',
        'year'                    => 'integer',
        'basic_salary'            => 'decimal:2',
        'tunjangan_jabatan'       => 'decimal:2',
        'tunjangan_masa_kerja'    => 'decimal:2',
        'tunjangan_kesehatan'     => 'decimal:2',
        'tunjangan_konsumsi'      => 'decimal:2',
        'bonus'                   => 'decimal:2',
        'allowances'              => 'decimal:2',
        'overtime_pay'            => 'decimal:2',
        'potongan_agnia_care'     => 'decimal:2',
        'potongan_biaya_konsumsi' => 'decimal:2',
        'potongan_bpjs'           => 'decimal:2',
        'potongan_kehadiran'      => 'decimal:2',
        'absent_days'             => 'integer',
        'late_hours'              => 'decimal:2',
        'overtime_hours'          => 'decimal:2',
        'potongan_kasbon'         => 'decimal:2',
        'deductions'              => 'decimal:2',
        'net_salary'              => 'decimal:2',
        'start_date'              => 'date',
        'end_date'                => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calculate and save payroll draft for a user.
     * Business rules Bakmi SA:
     * - Gaji Pokok FIXED per bulan (tidak proporsional per hari)
     * - Hari Efektif = total hari bulan - jatah libur (configurable)
     * - Tarif Per Jam = Gaji Pokok / Hari Efektif / 10
     * - Jatah libur tidak diambil → dihitung sebagai LEMBUR
     * - Izin terlambat yang approved → tidak dipotong dari Kehadiran
     * - Early check-in (≤ 60 menit sebelum shift) → jam kerja dari check-in nyata (10 jam)
     */
    public static function calculateForUser($userId, $month, $year, $startDateInput = null, $endDateInput = null)
    {
        $user        = User::findOrFail($userId);
        $basicSalary = floatval($user->basic_salary ?: 4500000);

        $startDate = $startDateInput
            ? Carbon::parse($startDateInput)
            : Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $endDateInput
            ? Carbon::parse($endDateInput)
            : Carbon::create($year, $month, 1)->endOfMonth();

        // ── HARI EFEKTIF & TARIF ─────────────────────────────────────────
        $leaveQuota    = intval(Setting::get('payroll_leave_quota', 3));
        $daysInMonth   = Carbon::create($year, $month)->daysInMonth;
        $effectiveDays = max(1, $daysInMonth - $leaveQuota);
        $hourlyRate    = $basicSalary / $effectiveDays / 10;
        $dailyRate     = $basicSalary / $effectiveDays;

        // ── DATA ABSENSI ─────────────────────────────────────────────────
        $attendances = Attendance::where('user_id', $userId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get();

        // ── LEAVES APPROVED (expand date ranges → array of dates) ────────
        $approvedLeaves = Leave::where('user_id', $userId)
            ->where('status', 'approved')
            ->where(function ($q) use ($startDate, $endDate) {
                $q->where('start_date', '<=', $endDate->toDateString())
                  ->where('end_date', '>=', $startDate->toDateString());
            })
            ->get();

        $jatahLiburDates    = []; // cuti/sakit/izin yang approved
        $izinTerlambatDates = []; // izin_terlambat yang approved

        foreach ($approvedLeaves as $leave) {
            $d = Carbon::parse($leave->start_date);
            $eol = Carbon::parse($leave->end_date);
            while ($d->lte($eol)) {
                $dateStr = $d->toDateString();
                if ($leave->type === 'izin_terlambat') {
                    $izinTerlambatDates[] = $dateStr;
                } else {
                    $jatahLiburDates[] = $dateStr;
                }
                $d->addDay();
            }
        }

        $jatahLiburDates    = array_unique($jatahLiburDates);
        $izinTerlambatDates = array_unique($izinTerlambatDates);
        $leavesTaken        = count($jatahLiburDates);

        // ── HITUNG MANGKIR ───────────────────────────────────────────────
        // Mangkir = hari tidak ada absensi DAN tidak ada approved leave
        $absentCount = 0;
        $today       = Carbon::today();
        $tempDate    = $startDate->copy();
        while ($tempDate->lte($endDate)) {
            if ($tempDate->gt($today)) break;
            $dateStr       = $tempDate->toDateString();
            $hasAttendance = $attendances->firstWhere('date', $dateStr) !== null;
            $hasLeave      = in_array($dateStr, $jatahLiburDates);
            if (!$hasAttendance && !$hasLeave) {
                $absentCount++;
            }
            $tempDate->addDay();
        }

        // ── BIAYA KONSUMSI (per hari mangkir) ────────────────────────────
        $biayaKonsumsiPerHari = floatval(Setting::get('payroll_biaya_konsumsi_per_hari', 13000));
        $potonganBiayaKonsumsi = $absentCount * $biayaKonsumsiPerHari;

        // ── HITUNG JAM TERLAMBAT ─────────────────────────────────────────
        // Skip jika hari itu ada izin_terlambat yang approved
        $lateHours = 0.0;
        foreach ($attendances as $att) {
            $statusVal = is_string($att->status) ? $att->status : $att->status->value;
            if ($statusVal !== 'terlambat' || !$att->check_in) continue;

            // Kecualikan jika ada izin terlambat approved
            if (in_array($att->date, $izinTerlambatDates)) continue;

            $attDate     = Carbon::parse($att->date);
            $activeShift = $user->activeShift($attDate);
            $startStr    = $activeShift?->start_time ?? null;

            if ($startStr) {
                try {
                    $checkIn    = Carbon::createFromFormat('H:i:s', $att->check_in);
                    $shiftStart = Carbon::createFromFormat('H:i:s', $startStr);
                    if ($checkIn->greaterThan($shiftStart)) {
                        $lateHours += round($checkIn->diffInMinutes($shiftStart) / 60, 2);
                    }
                } catch (\Exception $e) {
                    Log::warning("Payroll late hours parse error (user {$userId}): " . $e->getMessage());
                }
            }
        }

        // ── POTONGAN KEHADIRAN = mangkir + terlambat ─────────────────────
        $potonganKehadiran = ($absentCount * $dailyRate) + ($lateHours * $hourlyRate);

        // ── HITUNG LEMBUR DARI ABSENSI (dengan early check-in rule) ──────
        $earlyToleranceMinutes   = (int) Setting::get('early_checkin_tolerance_minutes', 60);
        $attendanceOvertimeHours = 0.0;

        foreach ($attendances as $att) {
            $statusVal = is_string($att->status) ? $att->status : $att->status->value;
            if ($statusVal !== 'lembur' || !$att->check_out || !$att->check_in) continue;

            try {
                $checkIn  = Carbon::createFromFormat('H:i:s', $att->check_in);
                $checkOut = Carbon::createFromFormat('H:i:s', $att->check_out);
                $attDate  = Carbon::parse($att->date);
                $shift    = $user->activeShift($attDate);

                if ($shift) {
                    $shiftStart = Carbon::createFromFormat('H:i:s', $shift->start_time);
                    $minsEarly  = $shiftStart->diffInMinutes($checkIn, false); // negatif jika lebih awal

                    // Early check-in dalam toleransi → effective end = check_in + 10 jam
                    if ($minsEarly < 0 && abs($minsEarly) <= $earlyToleranceMinutes) {
                        $effectiveEnd = $checkIn->copy()->addHours(10);
                    } else {
                        $effectiveEnd = Carbon::createFromFormat('H:i:s', $shift->end_time);
                    }
                } else {
                    // Tidak ada shift → selalu check_in + 10 jam
                    $effectiveEnd = $checkIn->copy()->addHours(10);
                }

                if ($checkOut->greaterThan($effectiveEnd)) {
                    $diffMins = $checkOut->diffInMinutes($effectiveEnd);
                    $attendanceOvertimeHours += round($diffMins / 60, 2);
                }
            } catch (\Exception $e) {
                Log::warning("Payroll overtime parse error (user {$userId}): " . $e->getMessage());
            }
        }

        // ── LEMBUR MANUAL (approved overtime requests) ────────────────────
        $manualOvertimeHours = OvertimeRequest::where('user_id', $userId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('status', 'approved')
            ->sum('hours');

        // ── JATAH LIBUR TIDAK DIAMBIL = LEMBUR ───────────────────────────
        $unusedLeave         = max(0, $leaveQuota - $leavesTaken);
        $unusedLeaveHours    = $unusedLeave * 10;

        $totalOvertimeHours = $attendanceOvertimeHours + floatval($manualOvertimeHours) + $unusedLeaveHours;
        $overtimePay        = $totalOvertimeHours * $hourlyRate;

        // ── TUNJANGAN GLOBAL ─────────────────────────────────────────────
        $presentCount  = $attendances->whereIn('status', ['hadir', 'terlambat', 'lembur', 'pulang_awal'])->count();
        $tunjKonsumsi  = floatval(Setting::get('payroll_tunjangan_konsumsi', 0));

        // Tunjangan Jabatan, Masa Kerja, Kesehatan, Bonus → 0 by default (diisi manual saat edit draft)
        $tunjJabatan    = 0;
        $tunjMasaKerja  = 0;
        $tunjKesehatan  = 0;
        $bonus          = 0;

        // ── POTONGAN ─────────────────────────────────────────────────────
        // Agnia Care/Zakat, BPJS, Kasbon → 0 by default (diisi manual saat edit draft)
        $potonganAgniaCare = 0;
        $potonganBpjs      = 0;
        $potonganKasbon    = 0;

        // ── TOTAL ALLOWANCES & DEDUCTIONS ────────────────────────────────
        $allowances = $tunjJabatan + $tunjMasaKerja + $tunjKesehatan + $tunjKonsumsi + $bonus;
        $deductions = $potonganAgniaCare + $potonganBiayaKonsumsi + $potonganBpjs + $potonganKehadiran + $potonganKasbon;

        // ── GAJI BERSIH (gaji pokok selalu penuh) ────────────────────────
        $netSalary = max(0, $basicSalary + $allowances + $overtimePay - $deductions);

        // ── SIMPAN / UPDATE DRAFT ────────────────────────────────────────
        $payroll = self::updateOrCreate(
            ['user_id' => $userId, 'month' => $month, 'year' => $year],
            [
                'basic_salary'            => $basicSalary,
                // Tunjangan detail
                'tunjangan_jabatan'       => $tunjJabatan,
                'tunjangan_masa_kerja'    => $tunjMasaKerja,
                'tunjangan_kesehatan'     => $tunjKesehatan,
                'tunjangan_konsumsi'      => $tunjKonsumsi,
                'bonus'                   => $bonus,
                'allowances'              => $allowances,
                // Lembur
                'overtime_pay'            => $overtimePay,
                'overtime_hours'          => $totalOvertimeHours,
                'potongan_agnia_care'     => $potonganAgniaCare,
                'potongan_biaya_konsumsi' => $potonganBiayaKonsumsi,
                'potongan_bpjs'           => $potonganBpjs,
                'potongan_kehadiran'      => $potonganKehadiran,
                'absent_days'             => $absentCount,
                'late_hours'              => $lateHours,
                'potongan_kasbon'         => $potonganKasbon,
                'deductions'              => $deductions,
                'net_salary'              => $netSalary,
                'status'                  => 'draft',
                'start_date'              => $startDate->toDateString(),
                'end_date'                => $endDate->toDateString(),
            ]
        );

        // ── PUSH NOTIFICATION ────────────────────────────────────────────
        try {
            $monthName    = Carbon::create($year, $month)->translatedFormat('F Y');
            $netFormatted = 'Rp ' . number_format($netSalary, 0, ',', '.');
            app(\App\Services\WebPushService::class)->sendToUser(
                $userId,
                '📋 Slip Gaji Tersedia',
                "Slip gaji Anda periode {$monthName} telah dihitung. Total: {$netFormatted}",
                ['url' => '/payrolls']
            );
        } catch (\Exception $e) {
            Log::warning('Push notif (payroll) failed: ' . $e->getMessage());
        }

        return $payroll;
    }
}
