<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');                                  // Nama bahan (Tepung Terigu, Gula, dll)
            $table->string('unit');                                  // Satuan (gram, liter, pcs, kg, ml)
            $table->decimal('price_per_unit', 15, 2)->default(0);   // Harga per satuan (Rp)
            $table->text('notes')->nullable();                       // Catatan tambahan
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materials');
    }
};
