<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Biaya overhead bulanan (listrik, sewa, kemasan, gas, dll) per user
        Schema::create('overhead_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');                                     // Nama biaya (Listrik, Sewa, Kemasan, dll)
            $table->decimal('monthly_amount', 15, 2)->default(0);      // Nominal per bulan (Rp)
            $table->text('notes')->nullable();                          // Catatan
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overhead_costs');
    }
};
