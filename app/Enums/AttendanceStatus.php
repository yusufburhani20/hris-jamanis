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
    case libur = 'libur';
    case cuti = 'cuti';
    case tidak_hadir = 'tidak_hadir';

    public function label(): string
    {
        return match($this) {
            self::hadir => 'Hadir',
            self::izin => 'Izin',
            self::sakit => 'Sakit',
            self::alpha => 'Tidak Hadir',
            self::tidak_hadir => 'Tidak Hadir',
            self::terlambat => 'Terlambat',
            self::pulang_awal => 'Pulang Lebih Awal',
            self::lembur => 'Lembur',
            self::libur => 'Libur',
            self::cuti => 'Cuti',
        };
    }
}
