<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case hadir = 'hadir';
    case izin = 'izin';
    case sakit = 'sakit';
    case alpha = 'alpha';
    case terlambat = 'terlambat';
    case pulang_awal = 'pulang_awal';
    case lembur = 'lembur';

    public function label(): string
    {
        return match($this) {
            self::hadir => 'Hadir',
            self::izin => 'Izin',
            self::sakit => 'Sakit',
            self::alpha => 'Alpha',
            self::terlambat => 'Terlambat',
            self::pulang_awal => 'Pulang Lebih Awal',
            self::lembur => 'Lembur',
        };
    }
}
