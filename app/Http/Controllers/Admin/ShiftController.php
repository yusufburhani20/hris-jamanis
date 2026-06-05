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
                $q->latest('user_shifts.start_date');
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

        // Terminate any active shift that overlaps or ends after start_date
        // Set their end_date to one day before the new start_date to maintain clean history
        $newStartDate = $request->start_date;
        $prevEndDate = date('Y-m-d', strtotime($newStartDate . ' -1 day'));

        UserShift::where('user_id', $request->user_id)
            ->where(function($q) use ($newStartDate) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $newStartDate);
            })
            ->update(['end_date' => $prevEndDate]);

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

        $newStartDate = $request->start_date;
        $prevEndDate = date('Y-m-d', strtotime($newStartDate . ' -1 day'));

        foreach ($request->user_ids as $userId) {
            // Terminate active shifts for this employee
            UserShift::where('user_id', $userId)
                ->where(function($q) use ($newStartDate) {
                    $q->whereNull('end_date')
                      ->orWhere('end_date', '>=', $newStartDate);
                })
                ->update(['end_date' => $prevEndDate]);

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
}
