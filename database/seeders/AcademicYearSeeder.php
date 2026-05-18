<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AcademicYearSeeder extends Seeder
{
    public function run(): void
    {
        $years = [
            ['name' => '2022/2023', 'is_active' => false],
            ['name' => '2023/2024', 'is_active' => false],
            ['name' => '2024/2025', 'is_active' => true],
            ['name' => '2025/2026', 'is_active' => false],
        ];

        foreach ($years as $year) {
            DB::table('academic_years')->updateOrInsert(
                ['name' => $year['name']],
                array_merge($year, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
