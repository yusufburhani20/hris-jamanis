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

        $startOfMonth = now()->startOfMonth()->toDateString();
        $endOfMonth = now()->endOfMonth()->toDateString();

        $employees->each(function($emp) use ($startOfMonth, $endOfMonth) {
            $dayOffs = UserShift::where('user_id', $emp->id)
                ->whereHas('shift', function($q) {
                    $q->where('is_dayoff', true);
                })
                ->where('start_date', '<=', $endOfMonth)
                ->where(function($q) use ($startOfMonth) {
                    $q->whereNull('end_date')
                      ->orWhere('end_date', '>=', $startOfMonth);
                })
                ->get();

            $dates = [];
            foreach ($dayOffs as $us) {
                $usStart = \Carbon\Carbon::parse($us->start_date)->max(\Carbon\Carbon::parse($startOfMonth));
                $usEnd   = $us->end_date ? \Carbon\Carbon::parse($us->end_date)->min(\Carbon\Carbon::parse($endOfMonth)) : \Carbon\Carbon::parse($endOfMonth);
                for ($d = $usStart->copy(); $d->lte($usEnd); $d->addDay()) {
                    $dates[] = $d->toDateString();
                }
            }
            $emp->monthly_days_off_count = count(array_unique($dates));
        });

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
            'start_time' => 'nullable|required_without:is_dayoff|date_format:H:i',
            'end_time' => 'nullable|required_without:is_dayoff|date_format:H:i',
            'is_dayoff' => 'boolean',
        ]);

        Shift::create([
            'name' => $request->name,
            'code' => strtoupper($request->code),
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'is_dayoff' => $request->boolean('is_dayoff', false),
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
            'start_time' => 'nullable|required_without:is_dayoff',
            'end_time' => 'nullable|required_without:is_dayoff',
            'is_dayoff' => 'boolean',
        ]);

        // Clean time format to H:i
        $startTime = $request->start_time ? date('H:i', strtotime($request->start_time)) : null;
        $endTime = $request->end_time ? date('H:i', strtotime($request->end_time)) : null;

        $shift->update([
            'name' => $request->name,
            'code' => strtoupper($request->code),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'is_dayoff' => $request->boolean('is_dayoff', false),
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

        $shift = Shift::findOrFail($request->shift_id);
        $isDayOff = (bool) $shift->is_dayoff;

        if ($this->checkOverlap($request->user_id, $request->start_date, $request->end_date, null, $isDayOff)) {
            return redirect()->back()->withErrors([
                'start_date' => $isDayOff
                    ? 'Karyawan sudah memiliki jadwal Libur pada rentang tanggal tersebut.'
                    : 'Karyawan sudah memiliki penugasan shift pada rentang tanggal tersebut.',
            ])->withInput();
        }

        UserShift::create([
            'user_id' => $request->user_id,
            'shift_id' => $request->shift_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
        ]);

        return redirect()->back()->with('success', $isDayOff ? 'Jadwal Libur berhasil ditugaskan ke karyawan.' : 'Shift berhasil ditugaskan ke karyawan.');
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

        $shift = Shift::findOrFail($request->shift_id);
        $isDayOff = (bool) $shift->is_dayoff;

        $conflictedNames = [];
        foreach ($request->user_ids as $userId) {
            if ($this->checkOverlap($userId, $request->start_date, $request->end_date, null, $isDayOff)) {
                $user = User::find($userId);
                if ($user) {
                    $conflictedNames[] = $user->name;
                }
            }
        }

        if (count($conflictedNames) > 0) {
            return redirect()->back()->withErrors([
                'start_date' => 'Karyawan berikut memiliki bentrok jadwal ' . ($isDayOff ? 'Libur' : 'shift') . ' pada tanggal tersebut: ' . implode(', ', $conflictedNames),
            ])->withInput();
        }

        foreach ($request->user_ids as $userId) {
            UserShift::create([
                'user_id' => $userId,
                'shift_id' => $request->shift_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
            ]);
        }

        return redirect()->back()->with('success', $isDayOff ? 'Jadwal Libur berhasil ditugaskan ke karyawan terpilih secara massal.' : 'Shift kerja berhasil ditugaskan ke karyawan terpilih secara massal.');
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
        $shift = Shift::findOrFail($request->shift_id);
        $isDayOff = (bool) $shift->is_dayoff;

        if ($this->checkOverlap($userShift->user_id, $request->start_date, $request->end_date, $userShift->id, $isDayOff)) {
            return redirect()->back()->withErrors([
                'start_date' => $isDayOff
                    ? 'Jadwal Libur bentrok dengan penugasan Libur lain yang sudah terdaftar.'
                    : 'Jadwal shift bentrok dengan penugasan lain yang sudah terdaftar.',
            ])->withInput();
        }

        $userShift->update([
            'shift_id' => $request->shift_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
        ]);

        return redirect()->back()->with('success', 'Penugasan shift berhasil diperbarui.');
    }

    /**
     * Helper to verify if a target shift range overlaps with existing ones.
     */
    private function checkOverlap($userId, $startDate, $endDate = null, $excludeUserShiftId = null, $isDayOff = false)
    {
        $S_n = \Carbon\Carbon::parse($startDate);
        $E_n = $endDate ? \Carbon\Carbon::parse($endDate) : \Carbon\Carbon::parse('9999-12-31');

        if ($S_n->gt($E_n)) {
            return true;
        }

        $query = UserShift::where('user_id', $userId)
            ->where(function($q) use ($S_n, $E_n) {
                $q->where('start_date', '<=', $E_n->toDateString())
                  ->where(function($sub) use ($S_n) {
                      $sub->whereNull('end_date')
                          ->orWhere('end_date', '>=', $S_n->toDateString());
                  });
            });

        if ($excludeUserShiftId !== null) {
            $query->where('id', '!=', $excludeUserShiftId);
        }

        // Jika shift yang sedang ditugaskan adalah Libur, hanya bentrok jika sesama shift Libur
        // Jika shift kerja biasa, hanya bentrok jika sesama shift kerja biasa
        if ($isDayOff) {
            $query->whereHas('shift', function($q) {
                $q->where('is_dayoff', true);
            });
        } else {
            $query->whereHas('shift', function($q) {
                $q->where('is_dayoff', false);
            });
        }

        return $query->exists();
    }
}
