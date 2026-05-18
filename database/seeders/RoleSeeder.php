<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use App\Enums\UserStatus;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Array roles
        $roles = [
            'Super Admin',
            'Pimpinan',
            'Admin',
            'Guru/Dosen',
            'Wali Kelas',
            'Staff/TU',
            'Bendahara'
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        // Helper function to create users safely
        $createUser = function($email, $data, $roleName) {
            // Cari user berdasarkan email ATAU nip
            $user = User::where('email', $email)
                        ->orWhere('nip', $data['nip'])
                        ->first();
            
            if (!$user) {
                $user = User::create(array_merge($data, [
                    'email' => $email,
                    'password' => Hash::make('password'),
                    'status' => UserStatus::active->value,
                    'email_verified_at' => now(),
                ]));
            } else {
                // Jika user sudah ada (baik email atau nip sama), 
                // pastikan emailnya sesuai (opsional, untuk konsistensi)
                if ($user->email !== $email) {
                    $user->update(['email' => $email]);
                }
            }
            
            $user->assignRole($roleName);
            return $user;
        };

        // Create Users
        $createUser('admin@salira.com', ['name' => 'System Administrator', 'nip' => '000000'], 'Super Admin');
        $createUser('pimpinan@salira.com', ['name' => 'Bapak Pimpinan', 'nip' => '111111'], 'Pimpinan');
        $createUser('guru@salira.com', ['name' => 'Bapak Guru', 'nip' => '222222'], 'Guru/Dosen');
        $createUser('walikelas@salira.com', ['name' => 'Ibu Wali Kelas', 'nip' => '333333'], 'Wali Kelas');
        $createUser('bendahara@salira.com', ['name' => 'Bendahara Sekolah', 'nip' => '444444'], 'Bendahara');
    }
}
