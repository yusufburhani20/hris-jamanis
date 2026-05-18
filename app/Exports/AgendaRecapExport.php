<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;

class AgendaRecapExport implements FromView, ShouldAutoSize, WithTitle
{
    protected $data;
    protected $matrix;
    protected $meta;

    public function __construct($data, $matrix = null, $meta = [])
    {
        $this->data = $data;
        $this->matrix = $matrix;
        $this->meta = $meta;
    }

    public function view(): View
    {
        return view('exports.agenda_excel', [
            'data' => $this->data,
            'matrix' => $this->matrix,
            'meta' => $this->meta
        ]);
    }

    public function title(): string
    {
        return 'Jurnal & Presensi';
    }
}
