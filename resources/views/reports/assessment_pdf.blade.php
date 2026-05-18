@extends('reports.pdf_layout')

@section('content')
<h3 style="font-size: 11px; border-left: 4px solid #000; padding-left: 10px; margin-bottom: 10px; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">Daftar Nilai Siswa</h3>
<table class="data">
    <thead>
        <tr>
            <th width="30" class="text-center">No</th>
            <th width="150">Nama Siswa</th>
            @foreach($assessments as $a)
                <th class="text-center">
                    <div style="font-weight: bold; color: #000;">{{ \Carbon\Carbon::parse($a['date'])->format('d/m') }}</div>
                    <div style="font-size: 7px; font-weight: normal; color: #333; text-transform: none;">{{ $a['title'] }}</div>
                </th>
            @endforeach
            <th class="text-center" width="60" style="background-color: #eee; color: #000;">Rata-rata</th>
        </tr>
    </thead>
    <tbody>
        @foreach($students as $index => $studentName)
        <tr>
            <td class="text-center">{{ $index + 1 }}</td>
            <td style="font-weight: bold; text-transform: uppercase;">{{ $studentName }}</td>
            @php $total = 0; $count = 0; @endphp
            @foreach($assessments as $a)
                @php 
                    $scoreObj = collect($a['scores'])->first(function($s) use ($studentName) {
                        return ($s['student']['name'] ?? '') === $studentName;
                    });
                    $val = $scoreObj['score'] ?? '-';
                    if ($val !== '-') {
                        $total += $val;
                        $count++;
                    }
                @endphp
                <td class="text-center" style="{{ $val != '-' ? 'font-weight: bold;' : 'color: #999;' }}">
                    {{ $val }}
                </td>
            @endforeach
            <td class="text-center" style="font-weight: 800; background-color: #f9f9f9;">
                {{ $count > 0 ? number_format($total / $count, 2) : '-' }}
            </td>
        </tr>
        @endforeach
        @if(count($students) == 0)
        <tr>
            <td colspan="{{ count($assessments) + 3 }}" class="text-center" style="padding: 30px; font-style: italic;">Tidak ada data penilaian untuk periode ini.</td>
        </tr>
        @endif
    </tbody>
</table>
@endsection
