<table>
    <thead>
        <tr>
            <th colspan="8" style="font-weight: bold; font-size: 16px; text-align: center;">LAPORAN PRESENSI KEHADIRAN KARYAWAN</th>
        </tr>
        @if($month)
            <tr>
                <th colspan="8" style="font-weight: bold; font-size: 12px; text-align: center;">Periode Bulan: {{ \Carbon\Carbon::parse($month)->translatedFormat('F Y') }}</th>
            </tr>
        @else
            <tr>
                <th colspan="8" style="font-weight: bold; font-size: 12px; text-align: center;">Periode: {{ \Carbon\Carbon::parse($startDate)->format('d-m-Y') }} s/d {{ \Carbon\Carbon::parse($endDate)->format('d-m-Y') }}</th>
            </tr>
        @endif
        <tr><th colspan="8"></th></tr>
    </thead>
    <tbody>
        @foreach($groupedAttendances as $employeeName => $records)
            <tr>
                <td colspan="8" style="font-weight: bold; background-color: #f4f4f4; border: 1px solid #000000; height: 25px;">Nama Karyawan: {{ $employeeName }}</td>
            </tr>
            <tr>
                <th style="font-weight: bold; background-color: #dbeafe; border: 1px solid #000000; text-align: center;">Tanggal</th>
                <th style="font-weight: bold; background-color: #dbeafe; border: 1px solid #000000; text-align: center;">Check-In</th>
                <th style="font-weight: bold; background-color: #dbeafe; border: 1px solid #000000; text-align: center;">Check-Out</th>
                <th style="font-weight: bold; background-color: #dbeafe; border: 1px solid #000000; text-align: center;">Status</th>
                <th style="font-weight: bold; background-color: #fef3c7; border: 1px solid #000000; text-align: center;">Terlambat</th>
                <th style="font-weight: bold; background-color: #e0e7ff; border: 1px solid #000000; text-align: center;">Lembur</th>
                <th style="font-weight: bold; background-color: #dbeafe; border: 1px solid #000000; text-align: center;">Verifikasi</th>
                <th style="font-weight: bold; background-color: #dbeafe; border: 1px solid #000000; text-align: center;">Keterangan</th>
            </tr>
            @foreach($records as $record)
                <tr>
                    <td style="border: 1px solid #000000; text-align: center;">{{ \Carbon\Carbon::parse($record->date)->format('d-m-Y') }}</td>
                    <td style="border: 1px solid #000000; text-align: center;">{{ $record->check_in ?? '-' }}</td>
                    <td style="border: 1px solid #000000; text-align: center;">{{ $record->check_out ?? '-' }}</td>
                    <td style="border: 1px solid #000000; text-align: center;">
                        @if($record->status instanceof \App\Enums\AttendanceStatus || (is_object($record->status) && method_exists($record->status, 'label')))
                            {{ $record->status->label() }}
                        @else
                            {{ ucfirst(str_replace('_', ' ', $record->status)) }}
                        @endif
                    </td>
                    <td style="border: 1px solid #000000; text-align: center; background-color: #fffbeb;">
                        @if($record->late_details)
                            {{ $record->late_details['text'] }}
                        @else
                            -
                        @endif
                    </td>
                    <td style="border: 1px solid #000000; text-align: center; background-color: #eef2ff;">
                        @if($record->overtime_details)
                            {{ $record->overtime_details['text'] }}
                        @else
                            -
                        @endif
                    </td>
                    <td style="border: 1px solid #000000; text-align: center;">
                        @if($record->verification_status instanceof \App\Enums\VerificationStatus || (is_object($record->verification_status) && method_exists($record->verification_status, 'label')))
                            {{ $record->verification_status->label() }}
                        @else
                            {{ ucfirst(str_replace('_', ' ', $record->verification_status)) }}
                        @endif
                    </td>
                    <td style="border: 1px solid #000000;">{{ $record->system_notes ?? '-' }}</td>
                </tr>
            @endforeach
            <tr><td colspan="8"></td></tr>
        @endforeach
    </tbody>
</table>
