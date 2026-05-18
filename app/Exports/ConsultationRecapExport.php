<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;

class ConsultationRecapExport implements FromView, ShouldAutoSize, WithTitle
{
    protected $data;
    protected $meta;

    public function __construct($data, $meta = [])
    {
        $this->data = $data;
        $this->meta = $meta;
    }

    public function view(): View
    {
        return view('exports.consultation_excel', [
            'data' => $this->data,
            'meta' => $this->meta
        ]);
    }

    public function title(): string
    {
        return 'Rekap Bimbingan';
    }
}
