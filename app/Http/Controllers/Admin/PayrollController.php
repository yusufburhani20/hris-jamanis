<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\User;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PayrollController extends Controller
{
    /**
     * Display payroll list for HRD.
     */
    public function index(Request $request)
    {
        $month = intval($request->query('month', Carbon::now()->month));
        $year = intval($request->query('year', Carbon::now()->year));

        $payrolls = Payroll::with('user:id,name,email,nip,basic_salary')
            ->where('month', $month)
            ->where('year', $year)
            ->get();

        $employees = User::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->get();

        $settings = [
            'payroll_late_penalty' => \App\Models\Setting::get('payroll_late_penalty', '50000'),
            'payroll_overtime_rate' => \App\Models\Setting::get('payroll_overtime_rate', '100000'),
            'payroll_allowance' => \App\Models\Setting::get('payroll_allowance', '500000'),
            'payroll_absent_penalty' => \App\Models\Setting::get('payroll_absent_penalty', '100000'),
            'payroll_working_days' => explode(',', \App\Models\Setting::get('payroll_working_days', 'Monday,Tuesday,Wednesday,Thursday,Friday')),
        ];

        return Inertia::render('Admin/Payrolls/Index', [
            'payrolls' => $payrolls,
            'employees' => $employees,
            'currentMonth' => $month,
            'currentYear' => $year,
            'payrollSettings' => $settings,
        ]);
    }

    /**
     * Calculate and generate payroll draft for an employee.
     */
    /**
     * Calculate and generate payroll draft for an employee.
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
        ]);

        $this->performCalculation($request->user_id, $request->month, $request->year);

        return redirect()->back()->with('success', 'Draf gaji berhasil dihitung berdasarkan rekap presensi, mangkir, dan lembur.');
    }

    /**
     * Calculate and generate payroll drafts for all employees.
     */
    public function calculateBulk(Request $request)
    {
        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
        ]);

        $month = $request->month;
        $year = $request->year;

        $employees = User::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->get();
        if ($employees->isEmpty()) {
            return redirect()->back()->with('error', 'Tidak ada karyawan untuk dihitung.');
        }

        foreach ($employees as $employee) {
            $this->performCalculation($employee->id, $month, $year);
        }

        return redirect()->back()->with('success', 'Draf gaji untuk seluruh karyawan berhasil dihitung.');
    }

    /**
     * Perform payroll calculation for a single employee.
     */
    private function performCalculation($userId, $month, $year)
    {
        $user = User::findOrFail($userId);
        $basicSalary = floatval($user->basic_salary ?: 4500000);

        // Calculate attendance metrics for that month/year
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $attendances = Attendance::where('user_id', $userId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get();

        $lateCount = $attendances->where('status', 'terlambat')->count();
        $overtimeCount = $attendances->where('status', 'lembur')->count();

        // Count manual approved overtime requests
        $manualOvertimeCount = \App\Models\OvertimeRequest::where('user_id', $userId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('status', 'approved')
            ->count();

        $overtimeCount += $manualOvertimeCount;

        $presentCount = $attendances->whereIn('status', ['hadir', 'terlambat', 'lembur', 'pulang_awal'])->count();

        // Get dynamic settings
        $latePenalty = floatval(\App\Models\Setting::get('payroll_late_penalty', 50000));
        $overtimeRate = floatval(\App\Models\Setting::get('payroll_overtime_rate', 100000));
        $fixedAllowance = floatval(\App\Models\Setting::get('payroll_allowance', 500000));
        $absentPenalty = floatval(\App\Models\Setting::get('payroll_absent_penalty', 100000));
        
        $workingDaysSetting = \App\Models\Setting::get('payroll_working_days', 'Monday,Tuesday,Wednesday,Thursday,Friday');
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
        Payroll::updateOrCreate(
            [
                'user_id' => $userId,
                'month' => $month,
                'year' => $year,
            ],
            [
                'basic_salary' => $basicSalary,
                'allowances' => $allowances,
                'deductions' => $deductions,
                'overtime_pay' => $overtimePay,
                'net_salary' => $netSalary,
                'status' => 'draft',
            ]
        );
    }

    /**
     * Save payroll settings.
     */
    public function saveSettings(Request $request)
    {
        $request->validate([
            'payroll_late_penalty' => 'required|numeric|min:0',
            'payroll_overtime_rate' => 'required|numeric|min:0',
            'payroll_allowance' => 'required|numeric|min:0',
            'payroll_absent_penalty' => 'required|numeric|min:0',
            'payroll_working_days' => 'required|array',
        ]);

        \App\Models\Setting::set('payroll_late_penalty', $request->payroll_late_penalty);
        \App\Models\Setting::set('payroll_overtime_rate', $request->payroll_overtime_rate);
        \App\Models\Setting::set('payroll_allowance', $request->payroll_allowance);
        \App\Models\Setting::set('payroll_absent_penalty', $request->payroll_absent_penalty);
        \App\Models\Setting::set('payroll_working_days', implode(',', $request->payroll_working_days));

        return redirect()->back()->with('success', 'Pengaturan parameter penggajian berhasil diperbarui.');
    }

    /**
     * Update an existing payroll draft manually.
     */
    public function update(Request $request, Payroll $payroll)
    {
        if ($payroll->status === 'paid') {
            return redirect()->back()->with('error', 'Gaji yang sudah dibayarkan tidak dapat diubah.');
        }

        $request->validate([
            'allowances' => 'required|numeric|min:0',
            'overtime_pay' => 'required|numeric|min:0',
            'deductions' => 'required|numeric|min:0',
        ]);

        $basicSalary = floatval($payroll->basic_salary);
        $allowances = floatval($request->allowances);
        $overtimePay = floatval($request->overtime_pay);
        $deductions = floatval($request->deductions);

        $netSalary = $basicSalary + $allowances + $overtimePay - $deductions;
        if ($netSalary < 0) {
            $netSalary = 0;
        }

        $payroll->update([
            'allowances' => $allowances,
            'overtime_pay' => $overtimePay,
            'deductions' => $deductions,
            'net_salary' => $netSalary,
        ]);

        return redirect()->back()->with('success', 'Draf gaji berhasil diperbarui secara manual.');
    }

    /**
     * Mark payroll as paid and send email slip notification.
     */
    public function pay(Payroll $payroll)
    {
        $payroll->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        // Send Email payslip notification
        try {
            $payrollWithUser = Payroll::with('user')->findOrFail($payroll->id);
            if ($payrollWithUser->user && $payrollWithUser->user->email) {
                \Illuminate\Support\Facades\Mail::to($payrollWithUser->user->email)->send(new \App\Mail\PayslipNotification($payrollWithUser));
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Email sending failed for payroll ID {$payroll->id}: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Gaji berhasil ditandai telah dibayarkan dan email slip gaji telah dikirim.');
    }

    /**
     * Mark all drafts for the period as paid (Bulk Pay) and send emails.
     */
    public function payBulk(Request $request)
    {
        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
            'ids' => 'nullable|array',
            'ids.*' => 'exists:payrolls,id',
        ]);

        $month = $request->month;
        $year = $request->year;

        $query = Payroll::with('user')
            ->where('month', $month)
            ->where('year', $year)
            ->where('status', 'draft');

        if ($request->has('ids') && !empty($request->ids)) {
            $query->whereIn('id', $request->ids);
        }

        $payrolls = $query->get();

        if ($payrolls->isEmpty()) {
            return redirect()->back()->with('error', 'Tidak ada draf gaji terpilih yang perlu dilunasi pada periode ini.');
        }

        foreach ($payrolls as $payroll) {
            $payroll->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            // Send Email payslip notification
            try {
                if ($payroll->user && $payroll->user->email) {
                    \Illuminate\Support\Facades\Mail::to($payroll->user->email)->send(new \App\Mail\PayslipNotification($payroll));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Email sending failed in bulk for payroll ID {$payroll->id}: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Draf gaji terpilih berhasil dilunasi dan email slip gaji dikirim.');
    }

    /**
     * Delete payroll draft.
     */
    public function destroy(Payroll $payroll)
    {
        if ($payroll->status === 'paid') {
            return redirect()->back()->with('error', 'Gaji yang sudah dibayarkan tidak dapat dihapus.');
        }

        $payroll->delete();

        return redirect()->back()->with('success', 'Draf gaji berhasil dihapus.');
    }
}
