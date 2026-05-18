<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Carbon\Carbon;

class AttendanceDetailedRecapExport implements FromCollection, WithHeadings, ShouldAutoSize
{
    protected $data;

    public function __construct($data)
    {
        $this->data = $data;
    }

    public function collection()
    {
        $dates = $this->data['dates'];
        $report = $this->data['report'];

        $collection = [];
        foreach ($report as $row) {
            $rowData = [$row['name']];
            
            foreach ($dates as $date) {
                $status = $row['daily'][$date] ?? '-';
                $code = '-';
                if ($status == 'hadir') $code = 'H';
                elseif ($status == 'sakit') $code = 'S';
                elseif ($status == 'izin') $code = 'I';
                elseif ($status == 'alpha') $code = 'A';
                elseif ($status == 'terlambat') $code = 'T';
                
                $rowData[] = $code;
            }

            $rowData[] = $row['summary']['hadir'];
            $rowData[] = $row['summary']['sakit'];
            $rowData[] = $row['summary']['izin'];
            $rowData[] = $row['summary']['alpha'];
            $rowData[] = $row['summary']['terlambat'];

            $collection[] = $rowData;
        }

        return collect($collection);
    }

    public function headings(): array
    {
        $dates = collect($this->data['dates'])->map(function($d) {
            return Carbon::parse($d)->format('d/m');
        })->toArray();

        return [
            ['Rekap Absensi Detail: ' . $this->data['class']],
            ['Rentang: ' . $this->data['range']],
            ['Mata Pelajaran: ' . ($this->data['subject'] ?? 'Semua')],
            [],
            array_merge(['Nama Siswa'], $dates, ['H', 'S', 'I', 'A', 'T'])
        ];
    }
}
