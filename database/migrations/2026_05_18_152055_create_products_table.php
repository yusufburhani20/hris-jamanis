<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');                                         // Nama produk/layanan
            $table->string('type');                                         // manufacturing | trading | service (auto-detected)
            $table->text('description')->nullable();                        // Deskripsi produk
            $table->string('unit')->default('pcs');                         // Satuan jual (pcs, porsi, kg, unit, dll)

            // Labor Costs (Biaya Tenaga Kerja)
            $table->decimal('labor_hours_per_unit', 8, 2)->default(0);     // Jam kerja per unit
            $table->decimal('labor_rate_per_hour', 15, 2)->default(0);     // Tarif upah per jam (Rp)

            // For Trading: direct purchase cost
            $table->decimal('purchase_price', 15, 2)->default(0);          // Harga beli (khusus dagang)
            $table->decimal('other_purchase_cost', 15, 2)->default(0);     // Biaya ongkir/lain-lain (khusus dagang)

            // Pricing
            $table->decimal('target_margin_percent', 5, 2)->default(30);   // Target margin keuntungan (%)
            $table->decimal('hpp', 15, 2)->default(0);                     // HPP hasil kalkulasi
            $table->decimal('selling_price', 15, 2)->default(0);           // Harga jual rekomendasi

            // Production units per month (for overhead allocation)
            $table->decimal('monthly_units', 10, 2)->default(1);           // Estimasi produksi per bulan

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
