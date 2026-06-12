<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Models\User;
use App\Models\Attendance;
use App\Models\Setting;
use App\Models\OvertimeRequest;
use Carbon\Carbon;

class Payroll extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'paid_at' => 'datetime',
        'month' => 'integer',
        'year' => 'integer',
        'basic_salary' => 'decimal:2',
        'allowances' => 'decimal:2',
        'deductions' => 'decimal:2',
        'overtime_pay' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calculate and save payroll draft for a user.
     */
    public static function calculateForUser($userId, $month, $year, $startDateInput = null, $endDateInput = null)
    {
        $user = User::findOrFail($userId);
        $basicSalary = floatval($user->basic_salary ?: 4500000);

        // Calculate attendance metrics for that month/year
        $startDate = $startDateInput ? Carbon::parse($startDateInput) : Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $endDateInput ? Carbon::parse($endDateInput) : Carbon::create($year, $month, 1)->endOfMonth();

        $attendances = Attendance::where('user_id', $userId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get();

        $lateCount = $attendances->where('status', 'terlambat')->count();
        $overtimeCount = $attendances->where('status', 'lembur')->count();

        // Count manual approved overtime requests
        $manualOvertimeCount = OvertimeRequest::where('user_id', $userId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('status', 'approved')
            ->count();

        $overtimeCount += $manualOvertimeCount;

        $presentCount = $attendances->whereIn('status', ['hadir', 'terlambat', 'lembur', 'pulang_awal'])->count();

        // Get dynamic settings
        $latePenalty = floatval(Setting::get('payroll_late_penalty', 50000));
        $overtimeRate = floatval(Setting::get('payroll_overtime_rate', 100000));
        $fixedAllowance = floatval(Setting::get('payroll_allowance', 500000));
        $absentPenalty = floatval(Setting::get('payroll_absent_penalty', 100000));
        
        $workingDaysSetting = Setting::get('payroll_working_days', 'Monday,Tuesday,Wednesday,Thursday,Friday');
        $workingDays = explode(',', $workingDaysSetting);

        // Calculate absent days (working days with no attendance up to today)
        $absentCount = 0;
        $tempDate = $startDate->copy();
        $today = Carbon::today();

        while ($tempDate->lte($endDate)) {
            // Do not penalize for future dates if calculating current month
            if ($tempDate->gt($today)) {
                break;
            }

            $dayOfWeek = $tempDate->format('l'); // 'Monday', 'Tuesday', etc.
            if (in_array($dayOfWeek, $workingDays)) {
                $hasAttendance = Attendance::where('user_id', $userId)
                    ->whereDate('date', $tempDate->toDateString())
                    ->exists();

                if (!$hasAttendance) {
                    $absentCount++;
                }
            }
            $tempDate->addDay();
        }

        // Tunjangan tetap
        $allowances = $fixedAllowance;
        if ($presentCount === 0) {
            $allowances = 0; // Tidak dapat tunjangan jika tidak pernah masuk sama sekali
        }

        // Deductions: Late penalty + Absent penalty
        $deductions = ($lateCount * $latePenalty) + ($absentCount * $absentPenalty);
        $overtimePay = $overtimeCount * $overtimeRate;

        $netSalary = $basicSalary + $allowances + $overtimePay - $deductions;
        if ($netSalary < 0) {
            $netSalary = 0;
        }

        // Save or update payroll draft
        $payroll = self::updateOrCreate(
            [
                'user_id' => $userId,
                'month'   => $month,
                'year'    => $year,
            ],
            [
                'basic_salary' => $basicSalary,
                'allowances'   => $allowances,
                'deductions'   => $deductions,
                'overtime_pay' => $overtimePay,
                'net_salary'   => $netSalary,
                'status'       => 'draft',
                'start_date'   => $startDate->toDateString(),
                'end_date'     => $endDate->toDateString(),
            ]
        );

        // Send push notification to the employee
        try {
            $monthName = Carbon::create($year, $month)->translatedFormat('F Y');
            $netFormatted = 'Rp ' . number_format($netSalary, 0, ',', '.');
            app(\App\Services\WebPushService::class)->sendToUser(
                $userId,
                '📋 Slip Gaji Tersedia',
                "Slip gaji Anda periode {$monthName} telah dihitung. Total: {$netFormatted}",
                ['url' => '/payrolls']
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Push notif (payroll) failed: ' . $e->getMessage());
        }

        return $payroll;
    }
}
