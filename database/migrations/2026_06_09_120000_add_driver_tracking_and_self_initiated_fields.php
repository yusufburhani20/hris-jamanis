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
        Schema::table('users', function (Blueprint $table) {
            $table->double('driver_lat', 10, 8)->nullable();
            $table->double('driver_lng', 11, 8)->nullable();
            $table->boolean('driver_is_sharing_location')->default(false);
            $table->timestamp('driver_location_updated_at')->nullable();
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->boolean('is_self_initiated')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'driver_lat', 
                'driver_lng', 
                'driver_is_sharing_location', 
                'driver_location_updated_at'
            ]);
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn('is_self_initiated');
        });
    }
};
