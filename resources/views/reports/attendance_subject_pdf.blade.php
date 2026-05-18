@extends('reports.pdf_layout')

@section('content')
<div style="margin-bottom: 15px; font-weight: bold; font-size: 11px;">
    Mata Pelajaran: <span style="color: #4f46e5">{{ $subject }}</span>
</div>

<table class="data">
    <thead>
        <tr>
            <th width="150">Nama Siswa</th>
            @foreach($dates as $date)
                <th class="text-center">{{ \Carbon\Carbon::parse($date)->format('d') }}</th>
            @endforeach
            <th class="text-center" style="background: #ecfdf5">H</th>
            <th class="text-center" style="background: #fffbeb">S</th>
            <th class="text-center" style="background: #eff6ff">I</th>
            <th class="text-center" style="background: #fef2f2">A</th>
            <th class="text-center" style="background: #fff7ed">T</th>
        </tr>
    </thead>
    <tbody>
        @foreach($report as $row)
        <tr>
            <td style="font-weight: bold; text-transform: uppercase;">{{ $row['name'] }}</td>
            @foreach($dates as $date)
                <td class="text-center">
                    @php $status = $row['daily'][$date] ?? '-'; @endphp
                    <span class="status-{{ $status }}">
                        {{ $status == 'hadir' ? 'H' : ($status == 'sakit' ? 'S' : ($status == 'izin' ? 'I' : ($status == 'alpha' ? 'A' : ($status == 'terlambat' ? 'T' : '-')))) }}
                    </span>
                </td>
            @endforeach
            <td class="text-center" style="font-weight: bold">{{ $row['summary']['hadir'] }}</td>
            <td class="text-center">{{ $row['summary']['sakit'] }}</td>
            <td class="text-center">{{ $row['summary']['izin'] }}</td>
            <td class="text-center" style="font-weight: bold; color: #ef4444">{{ $row['summary']['alpha'] }}</td>
            <td class="text-center">{{ $row['summary']['terlambat'] }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div style="margin-top: 20px; font-size: 9px; color: #64748b;">
    <strong>Keterangan:</strong> H (Hadir), S (Sakit), I (Izin), A (Alpha), T (Terlambat)
</div>
@endsection
