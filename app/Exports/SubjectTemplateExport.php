<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class SubjectTemplateExport implements WithHeadings, ShouldAutoSize
{
    public function headings(): array
    {
        return [
            'kode',
            'nama_mata_pelajaran',
            'deskripsi',
            'id_kelas_dipisahkan_koma',
        ];
    }
}
