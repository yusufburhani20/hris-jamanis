<?php

namespace App\Imports;

use App\Models\AcademicClass;
use App\Models\AcademicYear;
use App\Models\User;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;

class ClassesImport extends DefaultValueBinder implements ToModel, WithHeadingRow, SkipsOnError, WithCustomValueBinder
{
    use SkipsErrors;

    public function bindValue(Cell $cell, $value)
    {
        if (is_numeric($value)) {
            $cell->setValueExplicit($value, DataType::TYPE_STRING);
            return true;
        }

        return parent::bindValue($cell, $value);
    }

    public function model(array $row)
    {
        if (empty($row['nama_kelas'])) {
            return null;
        }

        // Resolve academic_year_id from name
        $yearId = null;
        if (!empty($row['tahun_ajaran'])) {
            $year = AcademicYear::where('name', $row['tahun_ajaran'])->first();
            $yearId = $year?->id;
        }

        // Resolve homeroom_teacher_id from name
        $teacherId = null;
        if (!empty($row['wali_kelas'])) {
            $teacher = User::where('name', $row['wali_kelas'])->first();
            $teacherId = $teacher?->id;
        }

        return new AcademicClass([
            'name'                => $row['nama_kelas'],
            'academic_year_id'    => $yearId,
            'homeroom_teacher_id' => $teacherId,
        ]);
    }
}
