<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Geofence;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed HR Admin
        User::updateOrCreate(
            ['email' => 'admin@hris.com'],
            [
                'name' => 'HR Admin Utama',
                'nip' => 'HR-0001',
                'phone' => '081234567890',
                'role' => 'admin',
                'status' => 'active',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // 2. Seed Employee
        User::updateOrCreate(
            ['email' => 'employee@hris.com'],
            [
                'name' => 'Karyawan Demo',
                'nip' => 'EMP-0023',
                'phone' => '089876543210',
                'role' => 'employee',
                'status' => 'active',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // 3. Seed Default Geofence Location (Monas, Jakarta Centre for simulation purposes)
        Geofence::updateOrCreate(
            ['name' => 'Kantor Pusat Jakarta (Monas)'],
            [
                'latitude' => -6.175392,
                'longitude' => 106.827153,
                'radius' => 150.00, // 150 meters radius
                'work_start_time' => '08:00:00',
                'work_end_time' => '17:00:00',
            ]
        );
    }
}
