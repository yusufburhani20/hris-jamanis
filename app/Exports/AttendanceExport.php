<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class AttendanceExport implements FromView, ShouldAutoSize
{
    protected $startDate;
    protected $endDate;
    protected $userId;
    protected $month;

    public function __construct($startDate, $endDate, $userId = null, $month = null)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->userId = $userId;
        $this->month = $month;
    }

    public function view(): View
    {
        $query = \App\Models\Attendance::with('user');

        if ($this->userId) {
            $query->where('user_id', $this->userId);
        }

        if ($this->month) {
            $monthDate = \Carbon\Carbon::parse($this->month);
            $startDate = $monthDate->copy()->day(25)->toDateString();
            $endDate   = $monthDate->copy()->addMonthNoOverflow()->day(24)->toDateString();
            $query->whereBetween('date', [$startDate, $endDate]);
        } else {
            $today = \Carbon\Carbon::today();
            if ($today->day >= 25) {
                $defaultStart = $today->copy()->day(25)->toDateString();
                $defaultEnd   = $today->copy()->addMonthNoOverflow()->day(24)->toDateString();
            } else {
                $defaultStart = $today->copy()->subMonthNoOverflow()->day(25)->toDateString();
                $defaultEnd   = $today->copy()->day(24)->toDateString();
            }
            $startDate = $this->startDate ?: $defaultStart;
            $endDate = $this->endDate ?: $defaultEnd;
            $query->whereBetween('date', [$startDate, $endDate]);
        }

        $attendances = $query->join('users', 'attendances.user_id', '=', 'users.id')
            ->orderBy('users.name', 'asc')
            ->orderBy('attendances.date', 'asc')
            ->select('attendances.*')
            ->get();

        $attendances = \App\Models\Attendance::injectDayOffs($attendances, $startDate, $endDate, $this->userId);
        
        $attendances = $attendances->sortBy(function($att) {
            return $att->user->name . '_' . $att->date;
        })->values();

        $groupedAttendances = $attendances->groupBy(function($item) {
            return $item->user->name;
        });

        return view('exports.attendances-excel', [
            'groupedAttendances' => $groupedAttendances,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'month' => $this->month,
        ]);
    }
}
