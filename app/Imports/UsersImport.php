<?php

namespace App\Imports;

use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\Hash;
use App\Enums\UserStatus;

class UsersImport implements ToCollection, WithHeadingRow
{
    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            $email = trim($row['email'] ?? '');
            
            if (empty($email) || empty($row['nama_lengkap'])) {
                continue;
            }

            // Normalize status
            $statusStr = strtolower(trim($row['status_activeinactivesuspended'] ?? 'active'));
            $status = UserStatus::active;
            if ($statusStr === 'inactive') $status = UserStatus::inactive;
            if ($statusStr === 'suspended') $status = UserStatus::suspended;

            $userData = [
                'name' => trim($row['nama_lengkap']),
                'nip' => !empty($row['nip']) ? trim((string)$row['nip']) : null,
                'phone' => !empty($row['whatsapp']) ? trim((string)$row['whatsapp']) : null,
                'telegram_id' => !empty($row['telegram_id']) ? trim((string)$row['telegram_id']) : null,
                'status' => $status,
            ];

            $user = User::where('email', $email)->first();

            if ($user) {
                $user->update($userData);
            } else {
                $userData['email'] = $email;
                $userData['password'] = Hash::make('password');
                $user = User::create($userData);
            }

            // Sync Roles
            if (!empty($row['roles_pisahkan_dengan_koma'])) {
                $roleNames = explode(',', $row['roles_pisahkan_dengan_koma']);
                $roleNames = array_map('trim', $roleNames);
                $user->syncRoles($roleNames);
            }
        }
    }
}
