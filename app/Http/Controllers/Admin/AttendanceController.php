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

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('month')) {
            $monthDate = Carbon::parse($request->month);
            $query->whereYear('date', $monthDate->year)
                  ->whereMonth('date', $monthDate->month);
        } elseif ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        $attendances = $query->latest('date')->latest('check_in')->get();

        $users = \App\Models\User::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Attendances/Index', [
            'attendances' => $attendances,
            'users' => $users,
            'filters' => $request->only(['start_date', 'end_date', 'user_id', 'month'])
        ]);
    }

    public function exportExcel(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $userId = $request->query('user_id');
        $month = $request->query('month');

        $fileName = "Laporan_Absensi";
        if ($month) {
            $fileName .= "_" . Carbon::parse($month)->format('Y_m');
        } elseif ($startDate && $endDate) {
            $fileName .= "_{$startDate}_sd_{$endDate}";
        } else {
            $fileName .= "_" . Carbon::now()->format('Y_m');
        }

        return Excel::download(new AttendanceExport($startDate, $endDate, $userId, $month), "{$fileName}.xlsx");
    }

    public function exportPdf(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $userId = $request->query('user_id');
        $month = $request->query('month');

        $query = Attendance::with('user');

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($month) {
            $monthDate = Carbon::parse($month);
            $query->whereYear('date', $monthDate->year)
                  ->whereMonth('date', $monthDate->month);
            $startDate = $monthDate->startOfMonth()->toDateString();
            $endDate = $monthDate->endOfMonth()->toDateString();
        } else {
            if (!$startDate) {
                $startDate = Carbon::now()->startOfMonth()->toDateString();
            }
            if (!$endDate) {
                $endDate = Carbon::now()->endOfMonth()->toDateString();
            }
            $query->whereBetween('date', [$startDate, $endDate]);
        }

        $attendances = $query->join('users', 'attendances.user_id', '=', 'users.id')
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
            'endDate' => $endDate,
            'month' => $month
        ]);

        $fileName = "Laporan_Absensi";
        if ($month) {
            $fileName .= "_" . Carbon::parse($month)->format('Y_m');
        } else {
            $fileName .= "_{$startDate}_sd_{$endDate}";
        }

        return $pdf->stream("{$fileName}.pdf");
    }
}
