<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;

class AssessmentRecapExport implements FromView, ShouldAutoSize, WithTitle
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
        $assessments = $this->data['assessments'];
        $students = $this->collectStudents($assessments);

        return view('exports.assessment_excel', [
            'assessments' => $assessments,
            'students' => $students,
            'meta' => $this->meta
        ]);
    }

    public function title(): string
    {
        return 'Rekap Penilaian';
    }

    protected function collectStudents($assessments)
    {
        $students = [];
        foreach ($assessments as $a) {
            foreach ($a['scores'] as $s) {
                if (isset($s['student']['name'])) {
                    $students[] = $s['student']['name'];
                }
            }
        }
        return array_values(array_unique($students));
    }
}
