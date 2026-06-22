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

        // Resolve any overlaps with existing shifts
        $this->resolveOverlappingShifts($request->user_id, $request->start_date, $request->end_date);

        // Insert new assignment
        UserShift::create([
            'user_id' => $request->user_id,
            'shift_id' => $request->shift_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
        ]);

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
            // Resolve any overlaps with existing shifts for this employee
            $this->resolveOverlappingShifts($userId, $request->start_date, $request->end_date);

            // Assign new shift
            UserShift::create([
                'user_id' => $userId,
                'shift_id' => $request->shift_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
            ]);
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
     * Resolve overlapping shift schedules for a user.
     */
    private function resolveOverlappingShifts($userId, $startDate, $endDate = null)
    {
        $S_n = \Carbon\Carbon::parse($startDate);
        $E_n = $endDate ? \Carbon\Carbon::parse($endDate) : null;

        // Query all shifts for this user that overlap with the new assignment
        $overlappingShifts = UserShift::where('user_id', $userId)
            ->where(function($query) use ($startDate, $endDate) {
                $query->where(function($q) use ($endDate) {
                    if ($endDate !== null) {
                        $q->where('start_date', '<=', $endDate);
                    }
                })
                ->where(function($q) use ($startDate) {
                    $q->whereNull('end_date')
                      ->orWhere('end_date', '>=', $startDate);
                });
            })
            ->get();

        foreach ($overlappingShifts as $shift) {
            $S_e = \Carbon\Carbon::parse($shift->start_date);
            $E_e = $shift->end_date ? \Carbon\Carbon::parse($shift->end_date) : null;

            // Case 1: The new shift completely covers the existing shift.
            if ($S_n->lte($S_e) && ($E_n === null || ($E_e !== null && $E_e->lte($E_n)))) {
                $shift->delete();
            }
            // Case 2: The new shift is strictly inside the existing shift.
            elseif ($S_e->lt($S_n) && $E_n !== null && ($E_e === null || $E_n->lt($E_e))) {
                $prevEndDate = $S_n->copy()->subDay()->toDateString();
                $nextStartDate = $E_n->copy()->addDay()->toDateString();

                // Duplicate the existing shift for the post-new-shift period
                UserShift::create([
                    'user_id' => $userId,
                    'shift_id' => $shift->shift_id,
                    'start_date' => $nextStartDate,
                    'end_date' => $E_e ? $E_e->toDateString() : null,
                ]);

                // Update the original existing shift to end before the new shift
                $shift->update([
                    'end_date' => $prevEndDate,
                ]);
            }
            // Case 3: The new shift overlaps the start of the existing shift.
            elseif ($S_n->lte($S_e) && $E_n !== null && $E_n->gte($S_e) && ($E_e === null || $E_n->lt($E_e))) {
                $nextStartDate = $E_n->copy()->addDay()->toDateString();
                $shift->update([
                    'start_date' => $nextStartDate,
                ]);
            }
            // Case 4: The new shift overlaps the end of the existing shift.
            else {
                $prevEndDate = $S_n->copy()->subDay()->toDateString();
                $shift->update([
                    'end_date' => $prevEndDate,
                ]);
            }
        }
    }
}
