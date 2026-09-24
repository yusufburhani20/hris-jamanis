<?php

namespace App\Exports;

use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class UsersExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return User::all();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nama',
            'Email',
            'NIP',
            'No. HP',
            'Role',
            'Status',
            'Gaji Pokok',
            'Tanggal Dibuat',
        ];
    }

    public function map($user): array
    {
        return [
            $user->id,
            $user->name,
            $user->email,
            $user->nip,
            $user->phone,
            $user->role,
            $user->status,
            $user->basic_salary,
            $user->created_at ? $user->created_at->format('Y-m-d H:i:s') : '',
        ];
    }
}
