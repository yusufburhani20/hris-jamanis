<?php

namespace App\Imports;

use App\Models\Student;
use App\Models\AcademicClass;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use Illuminate\Support\Collection;

class StudentsImport extends DefaultValueBinder implements ToCollection, WithHeadingRow, WithCustomValueBinder
{
    public function bindValue(Cell $cell, $value)
    {
        // For numbers that should stay as strings (NISN, NIS, Phone, etc.)
        if (is_numeric($value)) {
            $cell->setValueExplicit($value, DataType::TYPE_STRING);
            return true;
        }

        // Return default behavior for other values
        return parent::bindValue($cell, $value);
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            if (empty($row['nisn']) || empty($row['nama_lengkap'])) {
                continue;
            }

            // Resolve academic_class_id from class name if provided
            $classId = null;
            if (!empty($row['nama_kelas'])) {
                $searchName = trim($row['nama_kelas']);
                // Logic updated to match the consolidated name field (e.g., "X IPA 1")
                $class = AcademicClass::where('name', $searchName)
                    ->orWhere('name', 'LIKE', '%' . $searchName . '%')
                    ->first();
                
                $classId = $class?->id;
            }

            // Normalize gender
            $gender = strtoupper(trim($row['jenis_kelamin_lp'] ?? ''));
            if (!in_array($gender, ['L', 'P'])) {
                $gender = 'L';
            }

            // Normalize status
            $validStatuses = ['active', 'graduated', 'transferred', 'dropped_out'];
            $status = strtolower(trim($row['status'] ?? 'active'));
            if (!in_array($status, $validStatuses)) {
                $status = 'active';
            }

            // Safely parse date from various formats
            $birthDate = null;
            if (!empty($row['tanggal_lahir_yyyy_mm_dd'])) {
                $rawDate = $row['tanggal_lahir_yyyy_mm_dd'];
                try {
                    if (is_numeric($rawDate)) {
                        $birthDate = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($rawDate)->format('Y-m-d');
                    } else {
                        // Carbon natively reads MM/DD/YYYY if there are slashes. By replacing / with -, it interprets DD-MM-YYYY reliably.
                        $birthDate = \Carbon\Carbon::parse(str_replace('/', '-', $rawDate))->format('Y-m-d');
                    }
                } catch (\Exception $e) {
                    $birthDate = null;
                }
            }

            $nisn = trim((string) $row['nisn']);
            $nis = !empty($row['nis']) ? trim((string) $row['nis']) : null;

            // Find existing student by NISN or NIS to prevent unique constraint violation
            $student = Student::where('nisn', $nisn)->first();
            if (!$student && $nis) {
                $student = Student::where('nis', $nis)->first();
            }

            $updateData = [
                'nisn'         => $nisn,
                'nis'          => $nis,
                'name'         => trim($row['nama_lengkap']),
                'gender'       => $gender,
                'birth_place'  => trim($row['tempat_lahir'] ?? ''),
                'birth_date'   => $birthDate,
                'parent_name'  => trim($row['nama_orang_tua'] ?? ''),
                'parent_phone' => !empty($row['no_telepon_orang_tua']) ? trim((string) $row['no_telepon_orang_tua']) : null,
                'status'       => $status,
            ];

            if ($student) {
                $student->update($updateData);
            } else {
                $student = Student::create($updateData);
            }

            if ($classId) {
                // Attach or update active class
                $student->academicClasses()->syncWithoutDetaching([$classId => ['is_active' => true]]);
            }
        }
    }
}
