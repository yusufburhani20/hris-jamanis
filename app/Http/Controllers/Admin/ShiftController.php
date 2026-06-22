<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\User;
use App\Models\UserShift;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShiftController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $shifts = Shift::latest()->get();
        
        // Fetch employees with their assigned shifts
        $employees = User::where('role', 'LIKE', '%employee%')
            ->orWhere('role', 'LIKE', '%driver%')
            ->with(['shifts' => function($q) {
                $q->where(function($query) {
                    $query->whereNull('user_shifts.end_date')
                          ->orWhere('user_shifts.end_date', '>=', today());
                })->orderBy('user_shifts.start_date', 'asc');
            }])
            ->get();

        return Inertia::render('Admin/Shifts/Index', [
            'shifts' => $shifts,
            'employees' => $employees,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|unique:shifts,code|max:20',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
        ]);

        Shift::create([
            'name' => $request->name,
            'code' => strtoupper($request->code),
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
        ]);

        return redirect()->back()->with('success', 'Shift baru berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Shift $shift)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:shifts,code,' . $shift->id,
            'start_time' => 'required',
            'end_time' => 'required',
        ]);

        // Clean time format to H:i
        $startTime = date('H:i', strtotime($request->start_time));
        $endTime = date('H:i', strtotime($request->end_time));

        $shift->update([
            'name' => $request->name,
            'code' => strtoupper($request->code),
            'start_time' => $startTime,
            'end_time' => $endTime,
        ]);

        return redirect()->back()->with('success', 'Shift berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Shift $shift)
    {
        // Check if shift is currently assigned
        if ($shift->users()->count() > 0) {
            return redirect()->back()->with('error', 'Shift tidak dapat dihapus karena sedang ditugaskan pada karyawan.');
        }

        $shift->delete();

        return redirect()->back()->with('success', 'Shift berhasil dihapus.');
    }

    /**
     * Assign a shift to an employee.
     */
    public function assign(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'shift_id' => 'required|exists:shifts,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $this->resolveAndInsertShifts($request->user_id, $request->shift_id, $request->start_date, $request->end_date);

        return redirect()->back()->with('success', 'Shift berhasil ditugaskan ke karyawan.');
    }

    /**
     * Assign a shift to multiple employees (Bulk Assign).
     */
    public function assignBulk(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'shift_id' => 'required|exists:shifts,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        foreach ($request->user_ids as $userId) {
            $this->resolveAndInsertShifts($userId, $request->shift_id, $request->start_date, $request->end_date);
        }

        return redirect()->back()->with('success', 'Shift kerja berhasil ditugaskan ke karyawan terpilih secara massal.');
    }

    /**
     * Remove a shift assignment.
     */
    public function removeAssignment(Request $request)
    {
        $request->validate([
            'user_shift_id' => 'required|exists:user_shifts,id',
        ]);

        UserShift::findOrFail($request->user_shift_id)->delete();

        return redirect()->back()->with('success', 'Penugasan shift berhasil dibatalkan.');
    }

    /**
     * Update an existing shift assignment.
     */
    public function updateAssignment(Request $request)
    {
        $request->validate([
            'user_shift_id' => 'required|exists:user_shifts,id',
            'shift_id' => 'required|exists:shifts,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $userShift = UserShift::findOrFail($request->user_shift_id);

        $this->resolveAndInsertShifts(
            $userShift->user_id, 
            $request->shift_id, 
            $request->start_date, 
            $request->end_date, 
            $userShift->id
        );

        return redirect()->back()->with('success', 'Penugasan shift berhasil diperbarui.');
    }

    /**
     * Resolve shift intervals such that existing shifts cannot be overwritten.
     */
    private function resolveAndInsertShifts($userId, $shiftId, $startDate, $endDate = null, $excludeUserShiftId = null)
    {
        $S_n = \Carbon\Carbon::parse($startDate);
        $E_n = $endDate ? \Carbon\Carbon::parse($endDate) : \Carbon\Carbon::parse('9999-12-31');

        if ($S_n->gt($E_n)) {
            return;
        }

        // Fetch existing user shifts that are not the one we are editing
        $query = UserShift::where('user_id', $userId);
        if ($excludeUserShiftId !== null) {
            $query->where('id', '!=', $excludeUserShiftId);
        }
        $existingShifts = $query->orderBy('start_date', 'asc')->get();

        // Represent our new shift range as a list of intervals
        $intervals = [
            [$S_n, $E_n]
        ];

        foreach ($existingShifts as $existing) {
            $S_e = \Carbon\Carbon::parse($existing->start_date);
            $E_e = $existing->end_date ? \Carbon\Carbon::parse($existing->end_date) : \Carbon\Carbon::parse('9999-12-31');

            $nextIntervals = [];

            foreach ($intervals as $interval) {
                list($S_x, $E_x) = $interval;

                // Check for overlap:
                // No overlap if: E_e < S_x OR S_e > E_x
                if ($E_e->lt($S_x) || $S_e->gt($E_x)) {
                    $nextIntervals[] = [$S_x, $E_x];
                    continue;
                }

                // If there is an overlap, subtract [S_e, E_e] from [S_x, E_x]
                // 1. Part before the overlap: if S_x < S_e
                if ($S_x->lt($S_e)) {
                    $nextIntervals[] = [$S_x, $S_e->copy()->subDay()];
                }

                // 2. Part after the overlap: if E_x > E_e
                if ($E_x->gt($E_e)) {
                    $nextIntervals[] = [$E_e->copy()->addDay(), $E_x];
                }
            }

            $intervals = $nextIntervals;
        }

        // We will insert/update remaining intervals
        $reusedRecord = $excludeUserShiftId ? UserShift::find($excludeUserShiftId) : null;

        foreach ($intervals as $index => $interval) {
            list($S, $E) = $interval;
            $finalEndDate = $E->toDateString() === '9999-12-31' ? null : $E->toDateString();

            if ($reusedRecord && $index === 0) {
                $reusedRecord->update([
                    'shift_id' => $shiftId,
                    'start_date' => $S->toDateString(),
                    'end_date' => $finalEndDate,
                ]);
            } else {
                UserShift::create([
                    'user_id' => $userId,
                    'shift_id' => $shiftId,
                    'start_date' => $S->toDateString(),
                    'end_date' => $finalEndDate,
                ]);
            }
        }

        // If it was an edit but no intervals remained, delete the original record
        if ($reusedRecord && count($intervals) === 0) {
            $reusedRecord->delete();
        }
    }
}
