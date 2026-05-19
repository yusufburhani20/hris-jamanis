<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_number')->unique();
            $table->string('title');
            $table->string('origin_name');
            $table->string('destination_name');
            $table->double('origin_lat', 10, 8);
            $table->double('origin_lng', 11, 8);
            $table->double('destination_lat', 10, 8);
            $table->double('destination_lng', 11, 8);
            $table->foreignId('courier_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('courier_name')->nullable();
            $table->double('courier_lat', 10, 8)->nullable();
            $table->double('courier_lng', 11, 8)->nullable();
            $table->enum('status', ['packing', 'picked_up', 'in_transit', 'delivered', 'failed'])->default('packing');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
