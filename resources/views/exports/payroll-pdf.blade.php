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
            font-size: 12px;
            margin: 0;
            padding: 0;
        }
        .header {
            border-bottom: 3px double #e11d48;
            padding-bottom: 12px;
            margin-bottom: 15px;
        }
        .company-title {
            font-size: 24px;
            font-weight: bold;
            color: #e11d48;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .company-subtitle {
            font-size: 11px;
            color: #666666;
            margin-top: 2px;
        }
        .slip-title {
            font-size: 15px;
            font-weight: bold;
            text-align: center;
            margin: 10px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #9f1239;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 3px 0;
            vertical-align: top;
        }
        .meta-label {
            font-weight: bold;
            color: #4b5563;
            width: 110px;
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
            margin-bottom: 15px;
        }
        .finance-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e5e7eb;
        }
        .finance-table th {
            background-color: #f1f5f9;
            color: #1e293b;
            text-align: left;
            padding: 6px 10px;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            border-bottom: 1px solid #e5e7eb;
        }
        .finance-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        .amount-col {
            text-align: right;
            font-family: monospace;
            font-size: 12px;
        }
        .net-salary-box {
            background-color: #fff1f2;
            border: 2px solid #fecdd3;
            padding: 12px;
            border-radius: 8px;
            margin-top: 15px;
            margin-bottom: 20px;
        }
        .net-title {
            font-size: 12px;
            font-weight: bold;
            color: #9f1239;
            margin-bottom: 3px;
        }
        .net-amount {
            font-size: 18px;
            font-weight: bold;
            color: #e11d48;
            font-family: monospace;
        }
        .footer-section {
            margin-top: 30px;
            width: 100%;
        }
        .signature-table {
            width: 100%;
            text-align: center;
        }
        .signature-title {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 45px;
        }
        .signature-name {
            font-weight: bold;
            text-decoration: underline;
            color: #111827;
        }
        .badge {
            display: inline-block;
            padding: 1px 6px;
            font-size: 9px;
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
                    <div class="company-title">BAKMI SA</div>
                    <div class="company-subtitle">Kuliner Mie Lezat & Berkualitas</div>
                </td>
                <td style="text-align: right; vertical-align: bottom; font-size: 10px; color: #6b7280;">
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
                        <td class="meta-label">Jabatan</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value">
                            @if($payroll->user->role === 'admin')
                                Admin HRIS
                            @elseif($payroll->user->role === 'driver')
                                Sopir / Driver
                            @else
                                Karyawan / Staff
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
            <td style="width: 50%;">
                <table>
                    <tr>
                        <td class="meta-label">Periode</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value">
                            <strong>{{ $monthName }} {{ $payroll->year }}</strong>
                            @if($payroll->start_date && $payroll->end_date)
                                <br>
                                <span style="font-size: 10px; color: #6b7280; font-weight: normal;">
                                    ({{ \Carbon\Carbon::parse($payroll->start_date)->format('d/m/Y') }} - {{ \Carbon\Carbon::parse($payroll->end_date)->format('d/m/Y') }})
                                </span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td class="meta-label">Status Bayar</td>
                        <td class="meta-colon">:</td>
                        <td class="meta-value">
                            @if($payroll->status === 'paid')
                                <span class="badge badge-paid">Lunas (Paid)</span>
                            @else
                                <span class="badge badge-draft">Draf (Draft)</span>
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

    <!-- PENERIMAAN TABLE -->
    <div class="finance-container">
        <table class="finance-table">
            <thead>
                <tr>
                    <th style="width: 60%; background-color: #0f766e; color: #ffffff;">1. Rincian Penerimaan</th>
                    <th style="width: 40%; text-align: right; background-color: #0f766e; color: #ffffff;">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Gaji Pokok</td>
                    <td class="amount-col">Rp {{ number_format($payroll->basic_salary, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Tunjangan Jabatan</td>
                    <td class="amount-col">Rp {{ number_format($payroll->tunjangan_jabatan, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Tunjangan Masa Kerja</td>
                    <td class="amount-col">Rp {{ number_format($payroll->tunjangan_masa_kerja, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Tunjangan Kesehatan</td>
                    <td class="amount-col">Rp {{ number_format($payroll->tunjangan_kesehatan, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Tunjangan Konsumsi</td>
                    <td class="amount-col">Rp {{ number_format($payroll->tunjangan_konsumsi, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Lembur (Absensi + Jatah Libur Tidak Diambil)</td>
                    <td class="amount-col">Rp {{ number_format($payroll->overtime_pay, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Bonus</td>
                    <td class="amount-col">Rp {{ number_format($payroll->bonus, 0, ',', '.') }}</td>
                </tr>
                <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td>Total Penerimaan (A)</td>
                    <td class="amount-col" style="color: #0f766e;">Rp {{ number_format($payroll->basic_salary + $payroll->allowances + $payroll->overtime_pay, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- POTONGAN TABLE -->
    <div class="finance-container">
        <table class="finance-table">
            <thead>
                <tr>
                    <th style="width: 60%; background-color: #b91c1c; color: #ffffff;">2. Rincian Potongan</th>
                    <th style="width: 40%; text-align: right; background-color: #b91c1c; color: #ffffff;">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Agnia Care / Zakat</td>
                    <td class="amount-col">Rp {{ number_format($payroll->potongan_agnia_care, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Biaya Konsumsi (Mangkir)</td>
                    <td class="amount-col">Rp {{ number_format($payroll->potongan_biaya_konsumsi, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>BPJS Kesehatan & Ketenagakerjaan</td>
                    <td class="amount-col">Rp {{ number_format($payroll->potongan_bpjs, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Kehadiran (Mangkir & Terlambat)</td>
                    <td class="amount-col">Rp {{ number_format($payroll->potongan_kehadiran, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td>Kasbon / Pinjaman Karyawan</td>
                    <td class="amount-col">Rp {{ number_format($payroll->potongan_kasbon, 0, ',', '.') }}</td>
                </tr>
                <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td>Total Potongan (B)</td>
                    <td class="amount-col" style="color: #b91c1c;">Rp {{ number_format($payroll->deductions, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="net-salary-box">
        <div class="net-title">TOTAL DITERIMA KARYAWAN (NET SALARY = A - B)</div>
        <div class="net-amount">Rp {{ number_format($payroll->net_salary, 0, ',', '.') }}</div>
    </div>

    <div class="footer-section">
        <table class="signature-table">
            <tr>
                <td style="width: 60%;"></td>
                <td style="width: 40%;">
                    <div class="signature-title">Menyetujui,<br>Manajer HRD Bakmi SA</div>
                    <div style="height: 50px;"></div>
                    <div class="signature-name">Sistem HRIS Otomatis</div>
                    <div style="font-size: 9px; color: #9ca3af; margin-top: 2px;">Terverifikasi Secara Elektronik</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
