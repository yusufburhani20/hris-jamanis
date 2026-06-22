<!DOCTYPE html>
<html>
<head>
    <title>Laporan Absensi Karyawan</title>
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
        .late-badge { background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 9px; font-weight: bold; padding: 2px 5px; display: inline-block; }
        .ot-badge { background: #e0e7ff; color: #3730a3; border-radius: 6px; font-size: 9px; font-weight: bold; padding: 2px 5px; display: inline-block; }
        
        .photo-link { color: #4f46e5; text-decoration: none; font-size: 9px; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: right; font-size: 9px; color: #aaa; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Laporan Presensi Kehadiran Karyawan</h2>
        <p>Periode: {{ $startDate }} s/d {{ $endDate }}</p>
    </div>

    @foreach ($groupedAttendances as $teacherName => $records)
        <div class="teacher-section">
            <div class="teacher-name">Nama Karyawan: {{ $teacherName }}</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 12%">Tanggal</th>
                        <th style="width: 9%">Masuk</th>
                        <th style="width: 9%">Pulang</th>
                        <th style="width: 13%">Status</th>
                        <th style="width: 10%">Terlambat</th>
                        <th style="width: 10%">Lembur</th>
                        <th style="width: 22%">Keterangan</th>
                        <th style="width: 15%">Foto Selfie</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($records as $record)
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($record->date)->format('d M Y') }}</td>
                            <td>{{ $record->check_in ?? '-' }}</td>
                            <td>{{ $record->check_out ?? '-' }}</td>
                            <td>
                                <span class="status-badge status-{{ is_object($record->status) && method_exists($record->status, 'value') ? $record->status->value : $record->status }}">
                                    {{ is_object($record->status) && method_exists($record->status, 'label') ? $record->status->label() : ucfirst(str_replace('_', ' ', $record->status)) }}
                                </span>
                            </td>
                            <td>
                                @if($record->late_details)
                                    <span class="late-badge">⏰ {{ $record->late_details['text'] }}</span>
                                    <br><small style="color:#666; font-size:8px;">
                                        {{ $record->late_details['hours'] > 0 ? $record->late_details['hours'].'j ' : '' }}{{ $record->late_details['minutes'] }}m
                                    </small>
                                @else
                                    <span style="color:#ccc;">—</span>
                                @endif
                            </td>
                            <td>
                                @if($record->overtime_details)
                                    <span class="ot-badge">🌙 {{ $record->overtime_details['text'] }}</span>
                                    <br><small style="color:#666; font-size:8px;">
                                        {{ $record->overtime_details['hours'] > 0 ? $record->overtime_details['hours'].'j ' : '' }}{{ $record->overtime_details['minutes'] }}m
                                    </small>
                                @else
                                    <span style="color:#ccc;">—</span>
                                @endif
                            </td>
                            <td>{{ $record->system_notes }}</td>
                            <td>
                                @if($record->photo_url)
                                    <a href="{{ url($record->photo_url) }}" class="photo-link">In: [Link]</a><br>
                                @endif
                                @if($record->checkout_photo_url)
                                    <a href="{{ url($record->checkout_photo_url) }}" class="photo-link">Out: [Link]</a>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endforeach

    <div class="footer">
        Dicetak pada: {{ now()->format('d/m/Y H:i') }} | HRIS Enterprise System
    </div>
</body>
</html>
