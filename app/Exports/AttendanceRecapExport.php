<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class AttendanceRecapExport implements FromCollection, WithHeadings, ShouldAutoSize
{
    protected $data;

    public function __construct($data)
    {
        $this->data = $data;
    }

    public function collection()
    {
        return collect($this->data['report'])->map(function($row, $index) {
            return [
                'No' => $index + 1,
                'Nama Siswa' => $row['name'],
                'Hadir' => $row['summary']['hadir'],
                'Sakit' => $row['summary']['sakit'],
                'Izin' => $row['summary']['izin'],
                'Alpha' => $row['summary']['alpha'],
                'Terlambat' => $row['summary']['terlambat'],
            ];
        });
    }

    public function headings(): array
    {
        return [
            ['Rekap Absensi: ' . $this->data['class']],
            ['Rentang: ' . $this->data['range']],
            [],
            ['No', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Terlambat']
        ];
    }
}
