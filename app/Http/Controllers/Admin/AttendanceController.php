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
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('user', function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                })
                ->orWhere('system_notes', 'like', "%{$search}%")
                ->orWhere('status', 'like', "%{$search}%");
            });
        }

        $attendances = $query->latest('date')->latest('check_in')->get();

        $startDate = $request->start_date;
        $endDate = $request->end_date;

        if ($request->filled('month')) {
            $monthDate = Carbon::parse($request->month);
            $startDate = $monthDate->startOfMonth()->toDateString();
            $endDate = $monthDate->endOfMonth()->toDateString();
        } elseif (!$startDate || !$endDate) {
            $startDate = Carbon::now()->startOfMonth()->toDateString();
            $endDate = Carbon::now()->endOfMonth()->toDateString();
        }

        $attendances = Attendance::injectDayOffs($attendances, $startDate, $endDate, $request->user_id, $request->search);

        $perPage = (int) $request->input('per_page', 25);
        $page = (int) $request->input('page', 1);

        $total = $attendances->count();
        $items = $attendances->forPage($page, $perPage)->values();

        $paginatedAttendances = new \Illuminate\Pagination\LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        $users = \App\Models\User::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Attendances/Index', [
            'attendances' => $paginatedAttendances,
            'users' => $users,
            'filters' => $request->only(['start_date', 'end_date', 'user_id', 'month', 'search', 'per_page'])
        ]);
    }

    public function update(Request $request, Attendance $attendance)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:hadir,izin,sakit,alpha,tidak_hadir,terlambat,pulang_awal,lembur,libur,cuti',
            'verification_status' => 'required|string|in:valid,pending,rejected,system_flagged',
            'check_in' => 'nullable|string',
            'check_out' => 'nullable|string',
            'system_notes' => 'nullable|string|max:1000',
        ]);

        $updateData = [
            'status' => $validated['status'],
            'verification_status' => $validated['verification_status'],
        ];

        if ($request->has('check_in')) {
            $updateData['check_in'] = $validated['check_in'] ?: null;
        }

        if ($request->has('check_out')) {
            $updateData['check_out'] = $validated['check_out'] ?: null;
        }

        if ($request->has('system_notes')) {
            $updateData['system_notes'] = $validated['system_notes'];
        }

        $attendance->update($updateData);

        return back()->with('success', 'Data absensi karyawan berhasil diperbarui.');
    }

    public function resetCheckout(Attendance $attendance)
    {
        $attendance->update([
            'check_out' => null,
            'checkout_photo_path' => null,
            'checkout_accuracy' => null,
            'status' => 'hadir' // Resetting status back to hadir, as if they only checked in
        ]);

        return back()->with('success', 'Data check-out berhasil direset.');
    }

    public function destroy(Attendance $attendance)
    {
        $attendance->delete();
        return back()->with('success', 'Data absensi berhasil dihapus sepenuhnya.');
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

        $attendances = Attendance::injectDayOffs($attendances, $startDate, $endDate, $userId);

        $attendances = $attendances->sortBy(function($att) {
            return $att->user->name . '_' . $att->date;
        })->values();

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
