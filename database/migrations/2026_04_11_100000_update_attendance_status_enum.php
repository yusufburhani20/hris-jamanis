<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // For MySQL, we need to modify the enum column
        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('hadir', 'izin', 'sakit', 'alpha', 'terlambat', 'pulang_awal', 'lembur') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('hadir', 'izin', 'sakit', 'alpha', 'terlambat') NOT NULL");
    }
};
