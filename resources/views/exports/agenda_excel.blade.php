<html>
<body>
<table>
    <thead>
    <tr>
        <th colspan="6" style="font-weight: bold; font-size: 16px; text-align: center;">REKAP JURNAL &amp; PRESENSI TERPADU</th>
    </tr>
    <tr>
        <th colspan="6" style="font-weight: bold; font-size: 14px; text-align: center; color: #000;">{{ $meta['school_name'] }}</th>
    </tr>
    <tr>
        <th colspan="6"></th>
    </tr>
    <tr>
        <th colspan="2" style="font-weight: bold; background-color: #eee; border: 1px solid #000;">Kelas:</th>
        <th colspan="4" style="border: 1px solid #000;">{{ $meta['class_name'] }}</th>
    </tr>
    <tr>
        <th colspan="2" style="font-weight: bold; background-color: #eee; border: 1px solid #000;">Periode:</th>
        <th colspan="4" style="border: 1px solid #000;">{{ $meta['range'] }}</th>
    </tr>
    @if(isset($meta['subject_name']))
    <tr>
        <th colspan="2" style="font-weight: bold; background-color: #eee; border: 1px solid #000;">Mata Pelajaran:</th>
        <th colspan="4" style="border: 1px solid #000;">{{ $meta['subject_name'] }}</th>
    </tr>
    @endif
    <tr>
        <th colspan="2" style="font-weight: bold; background-color: #eee; border: 1px solid #000;">Guru Pengajar:</th>
        <th colspan="4" style="border: 1px solid #000;">{{ $meta['teacher_name'] }}</th>
    </tr>
    <tr>
        <th colspan="6"></th>
    </tr>

    <!-- I. Jurnal Mengajar -->
    <tr>
        <th colspan="6" style="font-weight: bold; background-color: #000; color: #ffffff; text-align: center; height: 30px;">I. JURNAL MENGAJAR</th>
    </tr>
    <tr>
        <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; text-align: center;">No</th>
        <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; width: 150px;">Hari / Tanggal</th>
        <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; text-align: center;">Jam</th>
        <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; width: 120px;">Mata Pelajaran</th>
        <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; width: 300px;">Topik / Materi Pembelajaran</th>
        <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; width: 350px;">Aktivitas &amp; Tugas Siswa</th>
    </tr>
    </thead>
    <tbody>
    @foreach($data as $index => $item)
        <tr>
            <td style="border: 1px solid #000; text-align: center; vertical-align: top;">{{ $index + 1 }}</td>
            <td style="border: 1px solid #000; vertical-align: top;">
                {{ \Carbon\Carbon::parse($item['date'])->isoFormat('dddd') }}<br>
                {{ \Carbon\Carbon::parse($item['date'])->format('d/m/Y') }}
            </td>
            <td style="border: 1px solid #000; text-align: center; vertical-align: top;">{{ $item['lesson_period'] }}</td>
            <td style="border: 1px solid #000; vertical-align: top; font-weight: bold;">{{ $item['subject']['name'] ?? ($item['subject_name'] ?? ($item['subject'] ?? '-')) }}</td>
            <td style="border: 1px solid #000; vertical-align: top; font-weight: bold;">{{ $item['topic'] }}</td>
            <td style="border: 1px solid #000; vertical-align: top;">
                {{ $item['activities'] }}
                @if(!empty($item['student_tasks']))
                    <br><span style="color: #333; font-style: italic;">Tugas: {{ $item['student_tasks'] }}</span>
                @endif
            </td>
        </tr>
    @endforeach
    </tbody>
</table>

@if($matrix)
<table>
    <thead>
    <tr>
        <th colspan="12"></th>
    </tr>
    <tr>
        <th colspan="12"></th>
    </tr>
    <tr>
        <th colspan="{{ count($matrix['dates']) + 7 }}" style="font-weight: bold; background-color: #000; color: #ffffff; text-align: center; height: 30px;">II. MATRIKS PRESENSI SISWA</th>
    </tr>
    <tr>
        <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; text-align: center;">No</th>
        <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; width: 200px;">Nama Siswa</th>
        @foreach($matrix['dates'] as $date)
            <th style="font-weight: bold; background-color: #eee; border: 2px solid #000000; text-align: center;">{{ \Carbon\Carbon::parse($date)->format('d/m') }}</th>
        @endforeach
        <th style="font-weight: bold; background-color: #ddd; border: 2px solid #000000; text-align: center;">H</th>
        <th style="font-weight: bold; background-color: #ddd; border: 2px solid #000000; text-align: center;">S</th>
        <th style="font-weight: bold; background-color: #ddd; border: 2px solid #000000; text-align: center;">I</th>
        <th style="font-weight: bold; background-color: #ddd; border: 2px solid #000000; text-align: center;">A</th>
        <th style="font-weight: bold; background-color: #ddd; border: 2px solid #000000; text-align: center;">T</th>
    </tr>
    </thead>
    <tbody>
    @foreach($matrix['report'] as $index => $row)
        <tr>
            <td style="border: 1px solid #000; text-align: center;">{{ $index + 1 }}</td>
            <td style="border: 1px solid #000; font-weight: bold;">{{ $row['name'] }}</td>
            @foreach($matrix['dates'] as $date)
                <td style="border: 1px solid #000; text-align: center;">
                    @php $status = strtolower($row['daily'][$date] ?? '-'); @endphp
                    @if($status == 'hadir') H @elseif($status == 'sakit') S @elseif($status == 'izin') I @elseif($status == 'alpha') A @elseif($status == 'terlambat') T @else - @endif
                </td>
            @endforeach
            <td style="border: 1px solid #000; text-align: center; font-weight: bold; background-color: #eee;">{{ $row['summary']['hadir'] }}</td>
            <td style="border: 1px solid #000; text-align: center;">{{ $row['summary']['sakit'] }}</td>
            <td style="border: 1px solid #000; text-align: center;">{{ $row['summary']['izin'] }}</td>
            <td style="border: 1px solid #000; text-align: center; font-weight: bold; background-color: #eee;">{{ $row['summary']['alpha'] }}</td>
            <td style="border: 1px solid #000; text-align: center;">{{ $row['summary']['terlambat'] }}</td>
        </tr>
    @endforeach
    </tbody>
</table>
@endif

</body>
</html>
