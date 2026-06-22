<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL ENUM tidak bisa di-alter via Blueprint, gunakan raw SQL
        DB::statement("ALTER TABLE leaves MODIFY COLUMN type ENUM('cuti','sakit','izin','izin_terlambat') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE leaves MODIFY COLUMN type ENUM('cuti','sakit','izin') NOT NULL");
    }
};
