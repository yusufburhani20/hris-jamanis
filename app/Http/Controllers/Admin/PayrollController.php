<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\User;
use App\Models\Setting;
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
        $year  = intval($request->query('year', Carbon::now()->year));

        $payrolls = Payroll::with('user:id,name,email,nip,basic_salary,role')
            ->where('month', $month)
            ->where('year', $year)
            ->get();

        $employees = User::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->get();

        $settings = [
            // Jatah libur & tarif
            'payroll_leave_quota'             => Setting::get('payroll_leave_quota', '3'),
            // Tunjangan global
            'payroll_tunjangan_konsumsi'      => Setting::get('payroll_tunjangan_konsumsi', '0'),
            // Potongan global
            'payroll_biaya_konsumsi_per_hari' => Setting::get('payroll_biaya_konsumsi_per_hari', '13000'),
            'payroll_bpjs_amount'             => Setting::get('payroll_bpjs_amount', '0'),
            // Periode & otomasi
            'payroll_period_start_day'        => Setting::get('payroll_period_start_day', '26'),
            'payroll_period_end_day'          => Setting::get('payroll_period_end_day', '25'),
            'payroll_auto_calculate_day'      => Setting::get('payroll_auto_calculate_day', '26'),
            'payroll_auto_calculate_enabled'  => Setting::get('payroll_auto_calculate_enabled', '0'),
        ];

        return Inertia::render('Admin/Payrolls/Index', [
            'payrolls'        => $payrolls,
            'employees'       => $employees,
            'currentMonth'    => $month,
            'currentYear'     => $year,
            'payrollSettings' => $settings,
        ]);
    }

    /**
     * Calculate and generate payroll draft for an employee.
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'user_id'    => 'required|exists:users,id',
            'month'      => 'required|integer|between:1,12',
            'year'       => 'required|integer|min:2020',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
        ]);

        $this->performCalculation($request->user_id, $request->month, $request->year, $request->start_date, $request->end_date);

        return redirect()->back()->with('success', 'Draf gaji berhasil dihitung berdasarkan rekap presensi, mangkir, dan lembur.');
    }

    /**
     * Calculate and generate payroll drafts for all employees.
     */
    public function calculateBulk(Request $request)
    {
        $request->validate([
            'month'      => 'required|integer|between:1,12',
            'year'       => 'required|integer|min:2020',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
        ]);

        $month     = $request->month;
        $year      = $request->year;
        $startDate = $request->start_date;
        $endDate   = $request->end_date;

        $employees = User::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->get();

        if ($employees->isEmpty()) {
            return redirect()->back()->with('error', 'Tidak ada karyawan untuk dihitung.');
        }

        foreach ($employees as $employee) {
            $this->performCalculation($employee->id, $month, $year, $startDate, $endDate);
        }

        return redirect()->back()->with('success', 'Draf gaji untuk seluruh karyawan berhasil dihitung.');
    }

    /**
     * Perform payroll calculation for a single employee.
     */
    private function performCalculation($userId, $month, $year, $startDateInput = null, $endDateInput = null)
    {
        Payroll::calculateForUser($userId, $month, $year, $startDateInput, $endDateInput);
    }

    /**
     * Save payroll settings.
     */
    public function saveSettings(Request $request)
    {
        $request->validate([
            'payroll_leave_quota'             => 'required|integer|min:0|max:15',
            'payroll_tunjangan_konsumsi'      => 'required|numeric|min:0',
            'payroll_biaya_konsumsi_per_hari' => 'required|numeric|min:0',
            'payroll_bpjs_amount'             => 'required|numeric|min:0',
            'payroll_period_start_day'        => 'required|integer|between:1,31',
            'payroll_period_end_day'          => 'required|integer|between:1,31',
            'payroll_auto_calculate_day'      => 'required|integer|between:1,31',
            'payroll_auto_calculate_enabled'  => 'required|in:0,1',
        ]);

        Setting::set('payroll_leave_quota', $request->payroll_leave_quota);
        Setting::set('payroll_tunjangan_konsumsi', $request->payroll_tunjangan_konsumsi);
        Setting::set('payroll_biaya_konsumsi_per_hari', $request->payroll_biaya_konsumsi_per_hari);
        Setting::set('payroll_bpjs_amount', $request->payroll_bpjs_amount);
        Setting::set('payroll_period_start_day', $request->payroll_period_start_day);
        Setting::set('payroll_period_end_day', $request->payroll_period_end_day);
        Setting::set('payroll_auto_calculate_day', $request->payroll_auto_calculate_day);
        Setting::set('payroll_auto_calculate_enabled', $request->payroll_auto_calculate_enabled);

        return redirect()->back()->with('success', 'Pengaturan parameter penggajian berhasil diperbarui.');
    }

    /**
     * Update an existing payroll draft manually (full breakdown fields).
     */
    public function update(Request $request, Payroll $payroll)
    {
        if ($payroll->status === 'paid') {
            return redirect()->back()->with('error', 'Gaji yang sudah dibayarkan tidak dapat diubah.');
        }

        $request->validate([
            // Tunjangan manual
            'tunjangan_jabatan'       => 'required|numeric|min:0',
            'tunjangan_masa_kerja'    => 'required|numeric|min:0',
            'tunjangan_kesehatan'     => 'required|numeric|min:0',
            'bonus'                   => 'required|numeric|min:0',
            // Lembur (override)
            'overtime_pay'            => 'required|numeric|min:0',
            // Potongan manual/editable
            'potongan_agnia_care'     => 'required|numeric|min:0',
            'potongan_biaya_konsumsi' => 'required|numeric|min:0',
            'potongan_bpjs'           => 'required|numeric|min:0',
            'potongan_kehadiran'      => 'required|numeric|min:0',
            'potongan_kasbon'         => 'required|numeric|min:0',
        ]);

        $basicSalary          = floatval($payroll->basic_salary);
        $tunjJabatan          = floatval($request->tunjangan_jabatan);
        $tunjMasaKerja        = floatval($request->tunjangan_masa_kerja);
        $tunjKesehatan        = floatval($request->tunjangan_kesehatan);
        $tunjKonsumsi         = floatval($payroll->tunjangan_konsumsi);
        $bonus                = floatval($request->bonus);
        $overtimePay          = floatval($request->overtime_pay);
        $potonganAgniaCare    = floatval($request->potongan_agnia_care);
        $potonganBiayaKons    = floatval($request->potongan_biaya_konsumsi);
        $potonganBpjs         = floatval($request->potongan_bpjs);
        $potonganKehadiran    = floatval($request->potongan_kehadiran);
        $potonganKasbon       = floatval($request->potongan_kasbon);

        $allowances = $tunjJabatan + $tunjMasaKerja + $tunjKesehatan + $tunjKonsumsi + $bonus;
        $deductions = $potonganAgniaCare + $potonganBiayaKons + $potonganBpjs + $potonganKehadiran + $potonganKasbon;
        $netSalary  = max(0, $basicSalary + $allowances + $overtimePay - $deductions);

        $payroll->update([
            'tunjangan_jabatan'       => $tunjJabatan,
            'tunjangan_masa_kerja'    => $tunjMasaKerja,
            'tunjangan_kesehatan'     => $tunjKesehatan,
            'bonus'                   => $bonus,
            'allowances'              => $allowances,
            'overtime_pay'            => $overtimePay,
            'potongan_agnia_care'     => $potonganAgniaCare,
            'potongan_biaya_konsumsi' => $potonganBiayaKons,
            'potongan_bpjs'           => $potonganBpjs,
            'potongan_kehadiran'      => $potonganKehadiran,
            'potongan_kasbon'         => $potonganKasbon,
            'deductions'              => $deductions,
            'net_salary'              => $netSalary,
        ]);

        return redirect()->back()->with('success', 'Draf gaji berhasil diperbarui secara manual.');
    }

    /**
     * Apply BPJS deduction to selected payroll drafts (bulk action).
     */
    public function applyBpjs(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'exists:payrolls,id',
        ]);

        $bpjsAmount = floatval(Setting::get('payroll_bpjs_amount', 0));
        if ($bpjsAmount <= 0) {
            return redirect()->back()->with('error', 'Nominal BPJS belum diatur di pengaturan penggajian.');
        }

        $payrolls = Payroll::whereIn('id', $request->ids)->where('status', 'draft')->get();
        $updated  = 0;

        foreach ($payrolls as $p) {
            $basicSalary       = floatval($p->basic_salary);
            $potonganBpjsBaru  = $bpjsAmount;
            $deductions        = floatval($p->deductions) - floatval($p->potongan_bpjs) + $potonganBpjsBaru;
            $netSalary         = max(0, $basicSalary + floatval($p->allowances) + floatval($p->overtime_pay) - $deductions);

            $p->update([
                'potongan_bpjs' => $potonganBpjsBaru,
                'deductions'    => $deductions,
                'net_salary'    => $netSalary,
            ]);
            $updated++;
        }

        return redirect()->back()->with('success', "BPJS sebesar Rp " . number_format($bpjsAmount, 0, ',', '.') . " berhasil diterapkan ke {$updated} karyawan.");
    }

    /**
     * Mark payroll as paid and send email slip notification.
     */
    public function pay(Payroll $payroll)
    {
        $payroll->update([
            'status'  => 'paid',
            'paid_at' => now(),
        ]);

        $notifEnabled = \App\Models\Setting::get('notif_payroll_paid_enabled', '1') === '1';
        if ($notifEnabled) {
            try {
                $payrollWithUser = Payroll::with('user')->findOrFail($payroll->id);
                if ($payrollWithUser->user && $payrollWithUser->user->email) {
                    \Illuminate\Support\Facades\Mail::to($payrollWithUser->user->email)->send(new \App\Mail\PayslipNotification($payrollWithUser));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Email sending failed for payroll ID {$payroll->id}: " . $e->getMessage());
            }

            try {
                app(\App\Services\WebPushService::class)->sendToUser(
                    $payroll->user_id,
                    '📋 Slip Gaji Diterbitkan',
                    "Gaji Anda untuk periode {$payroll->month}/{$payroll->year} telah selesai dihitung dan dibayarkan.",
                    ['url' => '/payrolls']
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("PWA payroll notification failed for User ID {$payroll->user_id}: " . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Gaji berhasil ditandai telah dibayarkan dan email slip gaji telah dikirim.');
    }

    /**
     * Mark all drafts for the period as paid (Bulk Pay) and send emails.
     */
    public function payBulk(Request $request)
    {
        $request->validate([
            'month'  => 'required|integer|between:1,12',
            'year'   => 'required|integer|min:2020',
            'ids'    => 'nullable|array',
            'ids.*'  => 'exists:payrolls,id',
        ]);

        $month = $request->month;
        $year  = $request->year;

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
                'status'  => 'paid',
                'paid_at' => now(),
            ]);

            $notifEnabled = \App\Models\Setting::get('notif_payroll_paid_enabled', '1') === '1';
            if ($notifEnabled) {
                try {
                    if ($payroll->user && $payroll->user->email) {
                        \Illuminate\Support\Facades\Mail::to($payroll->user->email)->send(new \App\Mail\PayslipNotification($payroll));
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Email bulk failed for payroll ID {$payroll->id}: " . $e->getMessage());
                }

                try {
                    app(\App\Services\WebPushService::class)->sendToUser(
                        $payroll->user_id,
                        '📋 Slip Gaji Diterbitkan',
                        "Gaji Anda untuk periode {$payroll->month}/{$payroll->year} telah selesai dihitung dan dibayarkan.",
                        ['url' => '/payrolls']
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning("PWA bulk payroll failed for User ID {$payroll->user_id}: " . $e->getMessage());
                }
            }
        }

        return redirect()->back()->with('success', 'Draf gaji terpilih berhasil dilunasi dan email slip gaji dikirim.');
    }

    /**
     * Delete multiple payroll drafts (bulk action).
     */
    public function destroyBulk(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'exists:payrolls,id',
        ]);

        $payrolls = Payroll::whereIn('id', $request->ids)->where('status', 'draft')->get();
        
        if ($payrolls->isEmpty()) {
            return redirect()->back()->with('error', 'Tidak ada draf gaji terpilih yang dapat dihapus.');
        }

        $count = 0;
        foreach ($payrolls as $p) {
            $p->delete();
            $count++;
        }

        return redirect()->back()->with('success', "{$count} draf gaji terpilih berhasil dihapus.");
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
