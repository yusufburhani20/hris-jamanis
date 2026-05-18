<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
        .header { border-bottom: 3px double #333; padding-bottom: 10px; margin-bottom: 20px; }
        .school-logo { width: 70px; height: 70px; float: left; margin-right: 20px; }
        .school-info { float: left; width: 80%; }
        .school-name { font-size: 20px; font-weight: bold; margin: 0; color: #1e293b; text-transform: uppercase; }
        .school-contact { font-size: 9px; color: #64748b; margin: 3px 0; }
        .report-title { font-size: 14px; margin: 10px 0 0; color: #1e293b; font-weight: bold; text-decoration: underline; text-align: center; clear: both; }
        .clear { clear: both; }
        
        .section-title { font-size: 11px; font-weight: bold; background: #f1f5f9; padding: 5px 10px; margin: 15px 0 10px; border-left: 4px solid #4f46e5; text-transform: uppercase; }
        
        .student-profile { margin-bottom: 20px; width: 100%; }
        .student-profile td { padding: 3px 0; }
        
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table.data th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; font-size: 9px; text-transform: uppercase; }
        table.data td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; vertical-align: middle; }
        
        .stats-grid { width: 100%; margin-bottom: 15px; }
        .stat-box { border: 1px solid #e2e8f0; padding: 10px; text-align: center; border-radius: 8px; }
        .stat-value { font-size: 16px; font-weight: bold; color: #4f46e5; margin-bottom: 2px; }
        .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; }
        
        .consultation-item { border-bottom: 1px dashed #e2e8f0; padding: 8px 0; }
        .consultation-date { font-size: 9px; color: #94a3b8; margin-bottom: 3px; }
        .consultation-topic { font-weight: bold; font-size: 10px; margin-bottom: 2px; }
        .consultation-note { font-style: italic; color: #475569; }

        .signature-table { width: 100%; margin-top: 40px; }
        .signature-box { text-align: center; }
        .signature-space { height: 60px; }
        
        .footer { position: fixed; bottom: 0; width: 100%; font-size: 8px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        @if($school_logo)
            <img src="{{ public_path('storage/'.$school_logo) }}" class="school-logo">
        @endif
        <div class="school-info">
            <h1 class="school-name">{{ $school_name }}</h1>
            <div class="school-contact">
                {{ $school_address }}<br>
                Telp: {{ $school_phone }} | Email: {{ $school_email }}
            </div>
        </div>
        <div class="clear"></div>
    </div>

    <h2 class="report-title">{{ $title }}</h2>
    <p style="text-align: center; font-size: 10px; margin-top: 5px;">Periode: {{ $range }}</p>

    <div class="section-title">Identitas Siswa</div>
    <table class="student-profile">
        <tr>
            <td width="15%">Nama Lengkap</td>
            <td width="35%">: <strong>{{ $student['name'] }}</strong></td>
            <td width="15%">NIS / NISN</td>
            <td width="35%">: {{ $student['nis'] }} / {{ $student['nisn'] }}</td>
        </tr>
        <tr>
            <td>Kelas</td>
            <td>: {{ $student['academic_classes'][0]['name'] ?? '-' }}</td>
            <td>Tahun Ajaran</td>
            <td>: {{ $student['academic_classes'][0]['academic_year']['name'] ?? '-' }}</td>
        </tr>
    </table>

    <div class="section-title">Ringkasan Kehadiran</div>
    <table style="width: 100%; border-spacing: 10px; border-collapse: separate;">
        <tr>
            <td width="20%"><div class="stat-box"><div class="stat-value">{{ $attendance['hadir'] }}</div><div class="stat-label">Hadir</div></div></td>
            <td width="20%"><div class="stat-box"><div class="stat-value">{{ $attendance['sakit'] }}</div><div class="stat-label">Sakit</div></div></td>
            <td width="20%"><div class="stat-box"><div class="stat-value">{{ $attendance['izin'] }}</div><div class="stat-label">Izin</div></div></td>
            <td width="20%"><div class="stat-box"><div class="stat-value">{{ $attendance['alpha'] }}</div><div class="stat-label">Alpha</div></div></td>
            <td width="20%"><div class="stat-box">
                <div class="stat-value">
                    {{ $attendance['total'] > 0 ? round(($attendance['hadir'] / $attendance['total']) * 100) : 0 }}%
                </div>
                <div class="stat-label">Persentase</div>
            </div></td>
        </tr>
    </table>

    <div class="section-title">Performa Akademik (Rata-rata Nilai)</div>
    <table class="data">
        <thead>
            <tr>
                <th width="50%">Mata Pelajaran</th>
                <th width="20%" style="text-align: center;">Jumlah Tugas/UH</th>
                <th width="30%" style="text-align: center;">Rata-rata Nilai</th>
            </tr>
        </thead>
        <tbody>
            @forelse($academics as $item)
                <tr>
                    <td>{{ $item['subject'] }}</td>
                    <td style="text-align: center;">{{ $item['count'] }}</td>
                    <td style="text-align: center;"><strong>{{ $item['average'] }}</strong></td>
                </tr>
            @empty
                <tr>
                    <td colspan="3" style="text-align: center; color: #94a3b8; font-style: italic;">Belum ada data penilaian</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="section-title">Catatan Perkembangan & Bimbingan</div>
    <div style="min-height: 100px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        @forelse($consultations as $item)
            <div class="consultation-item">
                <div class="consultation-date">{{ date('d/m/Y', strtotime($item['consultation_date'])) }} - Oleh: {{ $item['homeroom_teacher']['name'] ?? 'Guru BK' }}</div>
                <div class="consultation-topic">Topik: {{ $item['subject'] }}</div>
                <div class="consultation-note">"{{ $item['problem_description'] }}"</div>
            </div>
        @empty
            <p style="text-align: center; color: #94a3b8; font-style: italic; margin-top: 30px;">Tidak ada riwayat bimbingan khusus.</p>
        @endforelse
    </div>

    <table class="signature-table">
        <tr>
            <td width="40%" class="signature-box">
                Orang Tua / Wali Siswa,
                <div class="signature-space"></div>
                ( ........................................ )
            </td>
            <td width="20%"></td>
            <td width="40%" class="signature-box">
                {{ $report_location }}, {{ date('d F Y') }}<br>
                Kepala Sekolah,
                <div class="signature-space"></div>
                <strong>( {{ $school_name }} )</strong>
            </td>
        </tr>
    </table>

    <div class="footer">
        Dicetak secara otomatis oleh SALIRA Integrated System pada {{ date('d/m/Y H:i') }}
    </div>
</body>
</html>
