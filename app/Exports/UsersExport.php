<?php

namespace App\Exports;

use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class UsersExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function collection()
    {
        return User::with('roles')->latest()->get();
    }

    public function headings(): array
    {
        return [
            'Nama Lengkap',
            'Email',
            'NIP',
            'WhatsApp/Phone',
            'Telegram ID',
            'Roles (Pisahkan dengan koma)',
            'Status (active/inactive/suspended)',
        ];
    }

    public function map($user): array
    {
        return [
            $user->name,
            $user->email,
            $user->nip,
            $user->phone,
            $user->telegram_id,
            $user->roles->pluck('name')->implode(', '),
            $user->status?->value ?? $user->status,
        ];
    }
}
