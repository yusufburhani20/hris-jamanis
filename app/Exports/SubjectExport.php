<?php

namespace App\Exports;

use App\Models\Subject;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class SubjectExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return Subject::with('academicClasses')->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Kode',
            'Nama Mata Pelajaran',
            'Deskripsi',
            'Diterapkan Di Kelas (Nama)',
            'Diterapkan Di Kelas (ID)',
            'Dibuat Pada',
        ];
    }

    public function map($subject): array
    {
        return [
            $subject->id,
            $subject->code,
            $subject->name,
            $subject->description,
            $subject->academicClasses->pluck('name')->implode(', '),
            $subject->academicClasses->pluck('id')->implode(','),
            $subject->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
