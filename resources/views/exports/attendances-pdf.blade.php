<!DOCTYPE html>
<html>
<head>
    <title>Laporan Absensi Guru</title>
    <style>
        body { font-family: sans-serif; font-size: 11px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h2 { margin: 0; text-transform: uppercase; }
        .header p { margin: 5px 0 0; color: #666; }
        
        .teacher-section { margin-top: 25px; page-break-inside: avoid; }
        .teacher-name { background: #f4f4f4; padding: 8px; font-weight: bold; border-left: 4px solid #4f46e5; margin-bottom: 10px; font-size: 13px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table, th, td { border: 1px solid #ddd; }
        th { background-color: #f9fafb; padding: 8px; text-align: left; font-weight: bold; }
        td { padding: 8px; vertical-align: top; }
        
        .status-badge { padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .status-hadir { background: #d1fae5; color: #065f46; }
        .status-terlambat { background: #fef3c7; color: #92400e; }
        .status-pulang_awal { background: #ffedd5; color: #9a3412; }
        .status-lembur { background: #e0e7ff; color: #3730a3; }
        
        .photo-link { color: #4f46e5; text-decoration: none; font-size: 9px; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: right; font-size: 9px; color: #aaa; }
    </style>
</head>
<body>
    <div className="header">
        <h2>Laporan Presensi Kehadiran Guru</h2>
        <p>Periode: {{ $startDate }} s/d {{ $endDate }}</p>
    </div>

    @foreach ($groupedAttendances as $teacherName => $records)
        <div className="teacher-section">
            <div className="teacher-name">Nama Guru: {{ $teacherName }}</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%">Tanggal</th>
                        <th style="width: 10%">Masuk</th>
                        <th style="width: 10%">Pulang</th>
                        <th style="width: 15%">Status</th>
                        <th style="width: 30%">Keterangan</th>
                        <th style="width: 20%">Foto Selfie</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($records as $record)
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($record->date)->format('d M Y') }}</td>
                            <td>{{ $record->check_in ?? '-' }}</td>
                            <td>{{ $record->check_out ?? '-' }}</td>
                            <td>
                                <span className="status-badge status-{{ $record->status->value }}">
                                    {{ $record->status->label() }}
                                </span>
                            </td>
                            <td>{{ $record->system_notes }}</td>
                            <td>
                                @if($record->photo_url)
                                    <a href="{{ url($record->photo_url) }}" className="photo-link">In: [Link]</a><br>
                                @endif
                                @if($record->checkout_photo_url)
                                    <a href="{{ url($record->checkout_photo_url) }}" className="photo-link">Out: [Link]</a>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endforeach

    <div className="footer">
        Dicetak pada: {{ now()->format('d/m/Y H:i') }} | SALIRA Integrated System
    </div>
</body>
</html>
