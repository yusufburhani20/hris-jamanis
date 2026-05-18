@extends('reports.pdf_layout')

@section('content')
<h3 style="font-size: 11px; border-left: 4px solid #000; padding-left: 10px; margin-bottom: 10px; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">Daftar Konsultasi & Bimbingan Siswa</h3>
<table class="data">
    <thead>
        <tr>
            <th width="25" class="text-center">No</th>
            <th width="70">Tanggal</th>
            <th width="140">Siswa & Kelas</th>
            <th width="80" class="text-center">Kategori</th>
            <th>Perihal & Pembahasan</th>
            <th width="80" class="text-center">Status</th>
        </tr>
    </thead>
    <tbody>
        @foreach($data as $index => $item)
        <tr>
            <td class="text-center">{{ $index + 1 }}</td>
            <td class="text-center" style="font-weight: bold;">
                {{ \Carbon\Carbon::parse($item['consultation_date'])->format('d/m/Y') }}
            </td>
            <td>
                <div style="font-weight: bold; text-transform: uppercase;">{{ $item['student']['name'] ?? '-' }}</div>
                <div style="font-size: 8px; font-weight: bold;">{{ $item['academic_class']['name'] ?? ($item['academic_class_name'] ?? '-') }}</div>
            </td>
            <td class="text-center">
                <div style="background: #eee; padding: 4px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 8px; border: 1px solid #000;">
                    {{ $item['category'] }}
                </div>
            </td>
            <td>
                <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 2px;">{{ $item['subject'] }}</div>
                <div style="font-style: italic; font-size: 9px; line-height: 1.3;">"{{ $item['problem_description'] }}"</div>
                @if(!empty($item['advice_given']))
                    <div style="margin-top: 6px; background: #f9f9f9; padding: 5px; border-radius: 4px; border: 1px solid #eee;">
                        <strong style="font-size: 8px;">SOLUSI/SARAN:</strong> 
                        <div style="margin-top: 2px;">{{ $item['advice_given'] }}</div>
                    </div>
                @endif
            </td>
            <td class="text-center" style="vertical-align: middle;">
                <span style="font-weight: bold; text-transform: uppercase; font-size: 8px; background: #fff; padding: 3px 6px; border: 1px solid #000; border-radius: 10px;">
                    {{ str_replace('_', ' ', $item['follow_up_status']) }}
                </span>
            </td>
        </tr>
        @endforeach
        @if(count($data) == 0)
        <tr>
            <td colspan="6" class="text-center" style="padding: 40px; font-style: italic; border: 1px dashed #000;">Tidak ada data bimbingan siswa dalam periode ini.</td>
        </tr>
        @endif
    </tbody>
</table>
@endsection
