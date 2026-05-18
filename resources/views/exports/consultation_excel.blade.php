<html>
<body>
<table>
    <thead>
    <tr>
        <th colspan="9" style="font-weight: bold; font-size: 16px; text-align: center;">REKAP BIMBINGAN SISWA (KONSELING)</th>
    </tr>
    <tr>
        <th colspan="9" style="font-weight: bold; font-size: 14px; text-align: center; color: #000;">{{ $meta['school_name'] }}</th>
    </tr>
    <tr>
        <th colspan="9"></th>
    </tr>
    <tr>
        <th colspan="2" style="font-weight: bold; background-color: #eee; border: 1px solid #000;">Kelas:</th>
        <th colspan="7" style="border: 1px solid #000;">{{ $meta['class_name'] }}</th>
    </tr>
    <tr>
        <th colspan="2" style="font-weight: bold; background-color: #eee; border: 1px solid #000;">Periode:</th>
        <th colspan="7" style="border: 1px solid #000;">{{ $meta['range'] }}</th>
    </tr>
    <tr>
        <th colspan="2" style="font-weight: bold; background-color: #eee; border: 1px solid #000;">Guru Wali/BK:</th>
        <th colspan="7" style="border: 1px solid #000;">{{ $meta['teacher_name'] }}</th>
    </tr>
    <tr>
        <th colspan="9"></th>
    </tr>
    <tr>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; text-align: center;">No</th>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; width: 120px;">Tanggal</th>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; width: 180px;">Nama Siswa</th>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; width: 100px;">Kelas</th>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; width: 120px;">Kategori</th>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; width: 200px;">Perihal</th>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; width: 300px;">Masalah</th>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; width: 300px;">Saran/Solusi</th>
        <th style="font-weight: bold; background-color: #000; color: #ffffff; border: 2px solid #000000; width: 120px;">Status</th>
    </tr>
    </thead>
    <tbody>
    @foreach($data as $index => $item)
        <tr>
            <td style="border: 1px solid #000; text-align: center; vertical-align: top;">{{ $index + 1 }}</td>
            <td style="border: 1px solid #000; vertical-align: top; text-align: center;">{{ \Carbon\Carbon::parse($item['consultation_date'])->format('d/m/Y') }}</td>
            <td style="border: 1px solid #000; vertical-align: top; font-weight: bold;">{{ $item['student']['name'] ?? '-' }}</td>
            <td style="border: 1px solid #000; vertical-align: top; text-align: center;">{{ $item['academic_class']['name'] ?? '-' }}</td>
            <td style="border: 1px solid #000; vertical-align: top; text-align: center;">{{ $item['category'] }}</td>
            <td style="border: 1px solid #000; vertical-align: top; font-weight: bold;">{{ $item['subject'] }}</td>
            <td style="border: 1px solid #000; vertical-align: top;">{{ $item['problem_description'] }}</td>
            <td style="border: 1px solid #000; vertical-align: top;">{{ $item['advice_given'] }}</td>
            <td style="border: 1px solid #000; vertical-align: top; text-align: center; font-weight: bold;">{{ strtoupper($item['follow_up_status']) }}</td>
        </tr>
    @endforeach
    @if(count($data) == 0)
        <tr>
            <td colspan="9" style="border: 1px solid #000; text-align: center; padding: 20px; color: #333;">Tidak ada data bimbingan untuk periode ini.</td>
        </tr>
    @endif
    </tbody>
</table>
</body>
</html>
