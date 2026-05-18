<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Exports\AttendanceExport;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with('user');

        if ($request->has(['start_date', 'end_date'])) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        $attendances = $query->latest('date')->latest('check_in')->get();

        return Inertia::render('Admin/Attendances/Index', [
            'attendances' => $attendances,
            'filters' => $request->only(['start_date', 'end_date'])
        ]);
    }

    public function exportExcel(Request $request)
    {
        $startDate = $request->query('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth()->toDateString());

        return Excel::download(new AttendanceExport($startDate, $endDate), "Laporan_Absensi_{$startDate}_sd_{$endDate}.xlsx");
    }

    public function exportPdf(Request $request)
    {
        $startDate = $request->query('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth()->toDateString());

        $attendances = Attendance::with('user')
            ->whereBetween('date', [$startDate, $endDate])
            ->join('users', 'attendances.user_id', '=', 'users.id')
            ->orderBy('users.name', 'asc')
            ->orderBy('attendances.date', 'asc')
            ->select('attendances.*')
            ->get();

        $groupedAttendances = $attendances->groupBy(function($item) {
            return $item->user->name;
        });

        $pdf = Pdf::loadView('exports.attendances-pdf', [
            'groupedAttendances' => $groupedAttendances,
            'startDate' => $startDate,
            'endDate' => $endDate
        ]);

        return $pdf->download("Laporan_Absensi_{$startDate}_sd_{$endDate}.pdf");
    }
}
