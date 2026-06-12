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
            $query->whereYear('date', $monthDate->year)
                  ->whereMonth('date', $monthDate->month);
            $startDate = $monthDate->startOfMonth()->toDateString();
            $endDate = $monthDate->endOfMonth()->toDateString();
        } else {
            $startDate = $this->startDate ?: \Carbon\Carbon::now()->startOfMonth()->toDateString();
            $endDate = $this->endDate ?: \Carbon\Carbon::now()->endOfMonth()->toDateString();
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

        return view('exports.attendances-excel', [
            'groupedAttendances' => $groupedAttendances,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'month' => $this->month,
        ]);
    }
}
