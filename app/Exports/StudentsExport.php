<?php

namespace App\Exports;

use App\Models\Student;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class StudentsExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function collection()
    {
        return Student::with('academicClasses')->orderBy('name')->get();
    }

    public function headings(): array
    {
        return [
            'NISN',
            'NIS',
            'Nama Lengkap',
            'Jenis Kelamin (L/P)',
            'Tempat Lahir',
            'Tanggal Lahir (YYYY-MM-DD)',
            'Nama Orang Tua',
            'No. Telepon Orang Tua',
            'Status',
            'Nama Kelas',
        ];
    }

    public function map($student): array
    {
        return [
            $student->nisn,
            $student->nis,
            $student->name,
            $student->gender?->value ?? '',
            $student->birth_place,
            $student->birth_date,
            $student->parent_name,
            $student->parent_phone,
            $student->status?->value ?? '',
            $student->academicClass?->name ?? '',
        ];
    }
}
