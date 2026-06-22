<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            // ── Breakdown Penerimaan ──────────────────────────────
            $table->decimal('tunjangan_jabatan', 12, 2)->default(0)->after('basic_salary');
            $table->decimal('tunjangan_masa_kerja', 12, 2)->default(0)->after('tunjangan_jabatan');
            $table->decimal('tunjangan_kesehatan', 12, 2)->default(0)->after('tunjangan_masa_kerja');
            $table->decimal('tunjangan_konsumsi', 12, 2)->default(0)->after('tunjangan_kesehatan');
            $table->decimal('bonus', 12, 2)->default(0)->after('tunjangan_konsumsi');

            // ── Breakdown Potongan ────────────────────────────────
            $table->decimal('potongan_agnia_care', 12, 2)->default(0)->after('overtime_pay');
            $table->decimal('potongan_biaya_konsumsi', 12, 2)->default(0)->after('potongan_agnia_care');
            $table->decimal('potongan_bpjs', 12, 2)->default(0)->after('potongan_biaya_konsumsi');
            $table->decimal('potongan_kehadiran', 12, 2)->default(0)->after('potongan_bpjs');
            $table->decimal('potongan_kasbon', 12, 2)->default(0)->after('potongan_kehadiran');
        });
    }

    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'tunjangan_jabatan',
                'tunjangan_masa_kerja',
                'tunjangan_kesehatan',
                'tunjangan_konsumsi',
                'bonus',
                'potongan_agnia_care',
                'potongan_biaya_konsumsi',
                'potongan_bpjs',
                'potongan_kehadiran',
                'potongan_kasbon',
            ]);
        });
    }
};
