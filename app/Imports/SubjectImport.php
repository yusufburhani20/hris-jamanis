<?php

namespace App\Imports;

use App\Models\Subject;
use App\Models\AcademicClass;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;

class SubjectImport extends DefaultValueBinder implements ToCollection, WithHeadingRow, WithCustomValueBinder
{
    public function bindValue(Cell $cell, $value)
    {
        if (is_numeric($value)) {
            $cell->setValueExplicit($value, DataType::TYPE_STRING);
            return true;
        }

        return parent::bindValue($cell, $value);
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            // Skip empty rows
            if (empty($row['kode']) || empty($row['nama_mata_pelajaran'])) {
                continue;
            }

            $code = trim((string) $row['kode']);
            
            $subject = Subject::where('code', $code)->first();

            $data = [
                'code' => $code,
                'name' => trim($row['nama_mata_pelajaran']),
                'description' => $row['deskripsi'] ?? null,
            ];

            if ($subject) {
                $subject->update($data);
            } else {
                $subject = Subject::create($data);
            }

            // Also check 'kelas_dipisahkan_koma' in case they changed the header
            $classInput = $row['id_kelas_dipisahkan_koma'] ?? $row['kelas_dipisahkan_koma'] ?? null;
            
            if (!empty($classInput)) {
                $classItems = explode(',', $classInput);
                $classIds = [];
                
                foreach ($classItems as $item) {
                    $item = trim($item);
                    if (empty($item)) continue;
                    
                    if (is_numeric($item)) {
                        $classIds[] = $item;
                    } else {
                        // Find class by name
                        $class = AcademicClass::where('name', $item)
                            ->orWhere('name', 'LIKE', '%' . $item . '%')
                            ->first();
                        
                        if ($class) {
                            $classIds[] = $class->id;
                        }
                    }
                }
                
                if (count($classIds) > 0) {
                    $subject->academicClasses()->syncWithoutDetaching($classIds);
                }
            }
        }
    }
}
