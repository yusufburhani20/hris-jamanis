<!DOCTYPE html>
<html>
<head>
    <style>
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid black; padding: 5px; text-align: center; font-size: 10px; }
        .name-col { text-align: left; }
        .header { background-color: #f2f2f2; }
        .hadir { color: green; }
        .sakit { color: orange; }
        .izin { color: blue; }
        .alpha { color: red; }
    </style>
</head>
<body>
    <h2>Rekapitulasi Absensi Siswa</h2>
    <p>Kelas: {{ $class->name }}</p>
    <p>Periode: {{ $monthName }} {{ $year }}</p>

    <table>
        <thead>
            <tr className="header">
                <th rowspan="2">No</th>
                <th rowspan="2" class="name-col">Nama Siswa</th>
                <th colspan="{{ $daysInMonth }}">Tanggal</th>
                <th colspan="5">Total</th>
            </tr>
            <tr>
                @for($i=1; $i<=$daysInMonth; $i++)
                    <th>{{ $i }}</th>
                @endfor
                <th>H</th>
                <th>S</th>
                <th>I</th>
                <th>A</th>
                <th>T</th>
            </tr>
        </thead>
        <tbody>
            @foreach($report as $index => $row)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td class="name-col">{{ $row['name'] }}</td>
                    @for($i=1; $i<=$daysInMonth; $i++)
                        <td>
                            @php $s = $row['days'][$i]; @endphp
                            @if($s == 'hadir') H
                            @elseif($s == 'sakit') S
                            @elseif($s == 'izin') I
                            @elseif($s == 'alpha') A
                            @elseif($s == 'terlambat') T
                            @else - @endif
                        </td>
                    @endfor
                    <td>{{ $row['summary']['hadir'] }}</td>
                    <td>{{ $row['summary']['sakit'] }}</td>
                    <td>{{ $row['summary']['izin'] }}</td>
                    <td>{{ $row['summary']['alpha'] }}</td>
                    <td>{{ $row['summary']['terlambat'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
