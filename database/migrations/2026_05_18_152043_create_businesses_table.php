<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');                         // Nama usaha
            $table->string('industry')->nullable();         // Jenis industri (Makanan, Fashion, dll)
            $table->text('description')->nullable();        // Deskripsi usaha
            $table->string('phone')->nullable();            // Nomor HP/WA
            $table->string('address')->nullable();          // Alamat usaha
            $table->decimal('monthly_production_capacity', 15, 2)->default(0); // Kapasitas produksi/bulan
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};
