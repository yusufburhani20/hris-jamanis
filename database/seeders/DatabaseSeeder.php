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

        // 4. Seed Default Branch Shipment (KIR Style)
        $employee = User::where('role', 'employee')->first();
        if ($employee) {
            $shipment = \App\Models\Shipment::updateOrCreate(
                ['tracking_number' => 'KIR-20260519-001'],
                [
                    'title' => 'Distribusi Pengisian 150 Pcs Gamis & Baju Koko Lebaran',
                    'origin_name' => 'Gudang Pusat Jakarta (Monas)',
                    'destination_name' => 'Cabang Yogyakarta (Malioboro)',
                    'origin_lat' => -6.175392,
                    'origin_lng' => 106.827153,
                    'destination_lat' => -7.795580,
                    'destination_lng' => 110.369490,
                    'courier_id' => $employee->id,
                    'courier_name' => $employee->name,
                    'courier_lat' => -6.966667, // Currently transit in Semarang!
                    'courier_lng' => 110.416664,
                    'status' => 'in_transit',
                    'notes' => 'Gamis model terbaru. Harap letakkan di tempat kering.',
                ]
            );

            // Seed logs for this shipment
            \App\Models\ShipmentLog::updateOrCreate(
                ['shipment_id' => $shipment->id, 'status' => 'packing'],
                [
                    'title' => 'Paket sedang disiapkan di gudang asal',
                    'description' => 'Barang sedang dikemas di Gudang Pusat Jakarta (Monas) oleh staf logistik.',
                    'latitude' => -6.175392,
                    'longitude' => 106.827153,
                ]
            );

            \App\Models\ShipmentLog::updateOrCreate(
                ['shipment_id' => $shipment->id, 'status' => 'picked_up'],
                [
                    'title' => 'Paket diserahkan ke kurir logistik',
                    'description' => 'Kurir ' . $employee->name . ' telah memuat paket ke mobil box pengiriman dari Gudang Pusat Jakarta dan siap diberangkatkan.',
                    'latitude' => -6.175392,
                    'longitude' => 106.827153,
                ]
            );

            \App\Models\ShipmentLog::updateOrCreate(
                ['shipment_id' => $shipment->id, 'status' => 'in_transit'],
                [
                    'title' => 'Paket transit di HUB Semarang',
                    'description' => 'Paket telah sampai di Hub Logistik Semarang. Sedang proses pengecekan dokumen sebelum dikirim ke Yogyakarta via jalur darat.',
                    'latitude' => -6.966667,
                    'longitude' => 110.416664,
                ]
            );
        }
    }
}
