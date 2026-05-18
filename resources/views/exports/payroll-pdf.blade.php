<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SLIP GAJI - {{ $payroll->user->name }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333333;
            line-height: 1.4;
            font-size: 13px;
            margin: 0;
            padding: 0;
        }
        .header {
            border-bottom: 3px double #4f46e5;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .company-title {
            font-size: 22px;
            font-weight: bold;
            color: #4f46e5;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .company-subtitle {
            font-size: 11px;
            color: #666666;
            margin-top: 2px;
        }
        .slip-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin: 15px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #1e1b4b;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 4px 0;
            vertical-align: top;
        }
        .meta-label {
            font-weight: bold;
            color: #4b5563;
            width: 120px;
        }
        .meta-colon {
            width: 15px;
            color: #9ca3af;
        }
        .meta-value {
            color: #1f2937;
        }
        .finance-container {
            width: 100%;
            margin-bottom: 25px;
        }
        .finance-table {
            width: 100%;
            border-collapse: collapse;
        }
        .finance-table th {
            background-color: #4f46e5;
            color: #ffffff;
            text-align: left;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
        }
        .finance-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .amount-col {
            text-align: right;
            font-family: monospace;
            font-size: 13px;
        }
        .net-salary-box {
            background-color: #f5f3ff;
            border: 2px solid #ddd6fe;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            margin-bottom: 30px;
        }
        .net-title {
            font-size: 14px;
            font-weight: bold;
            color: #5b21b6;
            margin-bottom: 5px;
        }
        .net-amount {
            font-size: 20px;
            font-weight: bold;
            color: #4c1d95;
            font-family: monospace;
        }
        .footer-section {
            margin-top: 40px;
            width: 100%;
        }
        .signature-table {
            width: 100%;
            text-align: center;
        }
        .signature-title {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 50px;
        }
        .signature-name {
            font-weight: bold;
            text-decoration: underline;
            color: #111827;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 9999px;
            text-transform: uppercase;
        }
        .badge-paid {
            background-color: #d1fae5;
            color: #065f46;
        }
        .badge-draft {
            background-color: #fef3c7;
            color: #92400e;
        }
    </style>
</head>
<body>

    <div class="header">
        <table style="width: 100%;">
            <tr>
                <td>
                    <div class="company-title">HRIS ENTERPRISE</div>
                    <div class="company-subtitle">Sistem Manajemen Sumber Daya Manusia Terintegrasi</div>
                </td>
                <td style="text-align: right; vertical-align: bottom; font-size: 11px; color: #6b7280;">
                    Tanggal Cetak: {{ date('d/m/Y') }}
                </td>
            </tr>
        </table>
    </div>

    <div class="slip-title">SLIP GAJI KARYAWAN</div>

    <table class="meta-table">
        <tr>
            <td style="width: 50%;">
                <table>
                    <tr>
                        <td class="meta-label">Nama Karyawan</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value"><strong>{{ $payroll->user->name }}</strong></td>
                    </tr>
                    <tr>
                        <td class="meta-label">NIP</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value">{{ $payroll->user->nip ?: '-' }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Email</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value">{{ $payroll->user->email }}</td>
                    </tr>
                </table>
            </td>
            <td style="width: 50%;">
                <table>
                    <tr>
                        <td class="meta-label">Periode</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value"><strong>{{ $monthName }} {{ $payroll->year }}</strong></td>
                    </tr>
                    <tr>
                        <td class="meta-label">Status Bayar</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value">
                            @if($payroll->status === 'paid')
                                <span class="badge badge-paid">Lunas (Paid)</span>
                            @else
                                <span class="badge badge-draft">Konfirmasi (Draft)</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td class="meta-label">Waktu Bayar</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value">{{ $formattedPaidAt }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <div class="finance-container">
        <table class="finance-table">
            <thead>
                <tr>
                    <th style="width: 60%;">Deskripsi Rincian Penerimaan</th>
                    <th style="width: 40%; text-align: right;">Jumlah (Rupiah)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Gaji Pokok</td>
                    <td class="amount-col">Rp {{ number_format($payroll->basic_salary, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Tunjangan Kerja & Transportasi (Perfect Attendance Bonus)</td>
                    <td class="amount-col">Rp {{ number_format($payroll->allowances, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Upah Lembur Tambahan (Overtime Pay)</td>
                    <td class="amount-col">Rp {{ number_format($payroll->overtime_pay, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="finance-container">
        <table class="finance-table" style="margin-top: 15px;">
            <thead>
                <tr>
                    <th style="width: 60%; background-color: #e11d48;">Deskripsi Rincian Potongan</th>
                    <th style="width: 40%; text-align: right; background-color: #e11d48;">Jumlah (Rupiah)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Potongan Keterlambatan Presensi / Pelanggaran Jam Kerja</td>
                    <td class="amount-col" style="color: #e11d48;">Rp {{ number_format($payroll->deductions, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="net-salary-box">
        <div class="net-title">TOTAL GAJI BERSIH (NET SALARY)</div>
        <div class="net-amount">Rp {{ number_format($payroll->net_salary, 0, ',', '.') }}</div>
    </div>

    <div class="footer-section">
        <table class="signature-table">
            <tr>
                <td style="width: 60%;"></td>
                <td style="width: 40%;">
                    <div class="signature-title">Menyetujui,<br>Manajer HRD Enterprise</div>
                    <div style="height: 60px;"></div>
                    <div class="signature-name">Sistem HRIS Otomatis</div>
                    <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Terverifikasi Secara Elektronik</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
