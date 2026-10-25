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
        [$startDate, $endDate] = $this->resolvePeriodRange($request);

        $query = Attendance::with('user');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $query->whereBetween('date', [$startDate, $endDate]);

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

        $periodLabel = '25 ' . Carbon::parse($startDate)->locale('id')->isoFormat('MMM') . ' - 24 ' . Carbon::parse($endDate)->locale('id')->isoFormat('MMM YYYY');

        return Inertia::render('Admin/Attendances/Index', [
            'attendances' => $paginatedAttendances,
            'users' => $users,
            'filters' => array_merge($request->only(['user_id', 'month', 'search', 'per_page']), [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'period_label' => $periodLabel,
            ])
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
        [$startDate, $endDate] = $this->resolvePeriodRange($request);
        $userId = $request->query('user_id');

        $fileName = "Laporan_Absensi_{$startDate}_sd_{$endDate}";

        return Excel::download(new AttendanceExport($startDate, $endDate, $userId, null), "{$fileName}.xlsx");
    }

    public function exportPdf(Request $request)
    {
        [$startDate, $endDate] = $this->resolvePeriodRange($request);
        $userId = $request->query('user_id');

        $query = Attendance::with('user');

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $query->whereBetween('date', [$startDate, $endDate]);

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
            'month' => $request->query('month')
        ]);

        $fileName = "Laporan_Absensi_{$startDate}_sd_{$endDate}";

        return $pdf->stream("{$fileName}.pdf");
    }

    /**
     * Helper to resolve cut-off period date range (25 to 24).
     */
    private function resolvePeriodRange(Request $request): array
    {
        $today = Carbon::today();
        if ($today->day >= 25) {
            $defaultStart = $today->copy()->day(25)->toDateString();
            $defaultEnd   = $today->copy()->addMonthNoOverflow()->day(24)->toDateString();
        } else {
            $defaultStart = $today->copy()->subMonthNoOverflow()->day(25)->toDateString();
            $defaultEnd   = $today->copy()->day(24)->toDateString();
        }

        $startDate = $request->input('start_date');
        $endDate   = $request->input('end_date');
        $month     = $request->input('month');

        if ($month) {
            $monthDate = Carbon::parse($month);
            $startDate = $monthDate->copy()->day(25)->toDateString();
            $endDate   = $monthDate->copy()->addMonthNoOverflow()->day(24)->toDateString();
        } elseif (!$startDate || !$endDate) {
            $startDate = $defaultStart;
            $endDate   = $defaultEnd;
        }

        return [$startDate, $endDate];
    }
}
