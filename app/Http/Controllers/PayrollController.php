<?php

namespace App\Http\Controllers;

use App\Models\Payroll;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class PayrollController extends Controller
{
    /**
     * Display payroll list for the authenticated employee.
     */
    public function index()
    {
        $user = Auth::user();
        
        $payrolls = Payroll::where('user_id', $user->id)
            ->latest('year')
            ->latest('month')
            ->get();

        return Inertia::render('User/Payrolls/Index', [
            'payrolls' => $payrolls,
        ]);
    }

    /**
     * Download payslip PDF.
     */
    public function downloadPdf(Payroll $payroll)
    {
        // Security check: must belong to the logged-in user OR be an admin
        if ($payroll->user_id !== Auth::id() && !Auth::user()->isAdmin()) {
            abort(403, 'Unauthorized access.');
        }

        $payroll->load('user');

        $monthsIndo = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        $monthName = $monthsIndo[$payroll->month] ?? 'Bulan';

        $pdf = Pdf::loadView('exports.payroll-pdf', [
            'payroll' => $payroll,
            'monthName' => $monthName,
            'formattedPaidAt' => $payroll->paid_at ? $payroll->paid_at->format('d/m/Y H:i') : '-',
        ]);

        return $pdf->download("Slip_Gaji_{$payroll->user->name}_{$monthName}_{$payroll->year}.pdf");
    }
}
