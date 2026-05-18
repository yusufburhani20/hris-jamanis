<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->unsignedTinyInteger('month');
            $table->unsignedSmallInteger('year');
            $table->decimal('basic_salary', 12, 2)->default(0);
            $table->decimal('allowances', 12, 2)->default(0); // Tunjangan/Bonus
            $table->decimal('deductions', 12, 2)->default(0); // Potongan keterlambatan/bolos
            $table->decimal('overtime_pay', 12, 2)->default(0); // Upah lembur
            $table->decimal('net_salary', 12, 2)->default(0); // Gaji Bersih
            $table->enum('status', ['draft', 'paid'])->default('draft');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            
            // Prevent duplicate payroll for same user in same month/year
            $table->unique(['user_id', 'month', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payrolls');
    }
};
