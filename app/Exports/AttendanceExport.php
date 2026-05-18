<?php

namespace App\Exports;

use App\Models\Attendance;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceExport implements FromQuery, WithHeadings, WithMapping, WithStyles
{
    protected $startDate;
    protected $endDate;

    public function __construct($startDate, $endDate)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    public function query()
    {
        return Attendance::query()
            ->with('user')
            ->whereBetween('date', [$this->startDate, $this->endDate])
            ->join('users', 'attendances.user_id', '=', 'users.id')
            ->orderBy('users.name', 'asc')
            ->orderBy('attendances.date', 'asc')
            ->select('attendances.*');
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nama Guru',
            'Tanggal',
            'Check-In',
            'Check-Out',
            'Status',
            'Notes',
            'Link Foto Check-In',
            'Link Foto Check-Out',
        ];
    }

    public function map($attendance): array
    {
        return [
            $attendance->id,
            $attendance->user->name,
            $attendance->date,
            $attendance->check_in,
            $attendance->check_out,
            $attendance->status->label(),
            $attendance->system_notes,
            $attendance->photo_url ? url($attendance->photo_url) : '-',
            $attendance->checkout_photo_url ? url($attendance->checkout_photo_url) : '-',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1    => ['font' => ['bold' => true]],
        ];
    }
}
