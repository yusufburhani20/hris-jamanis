<?php

namespace App\Exports;

use App\Models\AcademicClass;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class ClassesExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function collection()
    {
        return AcademicClass::with(['academicYear', 'homeroomTeacher'])->orderBy('name')->get();
    }

    public function headings(): array
    {
        return [
            'Nama Kelas',
            'Tahun Ajaran',
            'Wali Kelas',
        ];
    }

    public function map($class): array
    {
        return [
            $class->name,
            $class->academicYear?->name ?? '',
            $class->homeroomTeacher?->name ?? '',
        ];
    }
}
