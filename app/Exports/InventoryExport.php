<?php

namespace App\Exports;

use App\Models\InventoryItem;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InventoryExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    public function collection()
    {
        return InventoryItem::with('category')->withCount([
            'barcodes as total_unit',
            'barcodes as tersedia' => function ($query) {
                $query->where('status', 'tersedia');
            },
            'barcodes as dipinjam' => function ($query) {
                $query->where('status', 'dipinjam');
            },
            'barcodes as perbaikan' => function ($query) {
                $query->where('status', 'perbaikan');
            },
            'barcodes as dihapus' => function ($query) {
                $query->where('status', 'dihapus');
            }
        ])->get();
    }

    public function headings(): array
    {
        return [
            'No',
            'Nama Barang',
            'Kode Item',
            'Kategori',
            'Total Keseluruhan',
            'Tersedia',
            'Dipinjam',
            'Perbaikan',
            'Dihapus/Musnah'
        ];
    }

    public function map($item): array
    {
        static $rowNumber = 0;
        $rowNumber++;

        return [
            $rowNumber,
            $item->name,
            $item->code,
            $item->category->name ?? '-',
            $item->total_unit ?? 0,
            $item->tersedia ?? 0,
            $item->dipinjam ?? 0,
            $item->perbaikan ?? 0,
            $item->dihapus ?? 0,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1    => ['font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'color' => ['rgb' => '4F46E5']]],
        ];
    }
}
