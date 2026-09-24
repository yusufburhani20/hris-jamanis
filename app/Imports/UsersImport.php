<?php

namespace App\Imports;

use App\Models\User;
use App\Enums\UserStatus;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class UsersImport implements ToModel, WithHeadingRow
{
    public function model(array $row)
    {
        // Pastikan baris memiliki email dan nama
        if (empty($row['email']) || empty($row['nama'])) {
            return null;
        }

        $user = User::where('email', $row['email'])->first();

        // Validasi dan parsing status
        $status = 'active';
        if (!empty($row['status'])) {
            $statusVal = strtolower($row['status']);
            if (in_array($statusVal, ['active', 'inactive', 'suspended'])) {
                $status = $statusVal;
            }
        }

        $role = !empty($row['role']) ? strtolower($row['role']) : 'employee';

        if ($user) {
            // Jika user sudah ada, lakukan update
            $user->update([
                'name' => $row['nama'],
                'nip' => $row['nip'] ?? $user->nip,
                'phone' => $row['no_hp'] ?? $user->phone,
                'role' => $role,
                'status' => $status,
                'basic_salary' => isset($row['gaji_pokok']) ? (float)$row['gaji_pokok'] : $user->basic_salary,
            ]);
            return null; 
        }

        // Jika user belum ada, insert baru
        return new User([
            'name' => $row['nama'],
            'email' => $row['email'],
            'nip' => $row['nip'] ?? null,
            'phone' => $row['no_hp'] ?? null,
            'password' => Hash::make('password'), // Password default
            'role' => $role,
            'status' => $status,
            'basic_salary' => isset($row['gaji_pokok']) ? (float)$row['gaji_pokok'] : 4500000,
        ]);
    }
}
