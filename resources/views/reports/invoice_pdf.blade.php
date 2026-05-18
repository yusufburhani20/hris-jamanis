<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Invoice {{ $bill->bill_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
        .page { padding: 30px 35px; }

        /* Header */
        .header-table { width: 100%; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; }
        .school-logo { width: 60px; height: 60px; }
        .school-info-name { font-size: 17px; font-weight: bold; color: #1e293b; }
        .school-info-sub { font-size: 9px; color: #64748b; margin-top: 3px; }
        .invoice-label { font-size: 22px; font-weight: bold; color: #4f46e5; letter-spacing: 2px; }
        .invoice-number { font-size: 10px; color: #64748b; margin-top: 2px; }

        /* Status Badge */
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: bold; letter-spacing: 0.5px; margin-top: 5px; }
        .status-paid { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .status-unpaid { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
        .status-pending { background: #fef9c3; color: #ca8a04; border: 1px solid #fde047; }

        /* Info Grid */
        .info-table { width: 100%; margin-bottom: 20px; border-spacing: 8px; border-collapse: separate; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; }
        .info-box-label { font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
        .info-box-value { font-size: 12px; font-weight: bold; color: #1e293b; }
        .info-box-sub { font-size: 9px; color: #64748b; margin-top: 2px; }

        /* Detail Table */
        .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px; }
        table.detail { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.detail thead th { background: #4f46e5; color: #fff; padding: 8px 12px; font-size: 9px; text-align: left; }
        table.detail tbody td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
        table.detail tbody tr:last-child td { border-bottom: none; }
        table.detail tfoot td { padding: 10px 12px; border-top: 2px solid #e2e8f0; font-weight: bold; font-size: 12px; }
        .text-right { text-align: right; }
        .total-amount { color: #4f46e5; font-size: 14px; }

        /* Paid Info */
        .paid-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; }
        .paid-box-label { font-size: 9px; color: #15803d; }
        .paid-box-value { font-size: 12px; font-weight: bold; color: #166534; margin-top: 2px; }

        /* Footer */
        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        .footer p { font-size: 8px; color: #94a3b8; text-align: center; }

        /* Watermark */
        .watermark { position: fixed; top: 45%; left: 15%; font-size: 72px; font-weight: bold; color: rgba(16, 185, 129, 0.07); text-transform: uppercase; letter-spacing: 10px; transform: rotate(-30deg); pointer-events: none; }
    </style>
</head>
<body>
<div class="page">

    @if($bill->status === 'paid')
    <div class="watermark">LUNAS</div>
    @endif

    {{-- HEADER --}}
    <table class="header-table">
        <tr>
            <td width="10%" valign="middle">
                @if($logo)
                    <img src="{{ public_path('storage/' . $logo) }}" class="school-logo">
                @endif
            </td>
            <td valign="middle">
                <div class="school-info-name">{{ $school_name }}</div>
                <div class="school-info-sub">Sistem Administrasi Sekolah Terpadu (SALIRA)</div>
            </td>
            <td width="30%" valign="middle" style="text-align: right;">
                <div class="invoice-label">INVOICE</div>
                <div class="invoice-number">No. {{ $bill->bill_number }}</div>
                <div>
                    @if($bill->status === 'paid')
                        <span class="status-badge status-paid">LUNAS</span>
                    @elseif($bill->status === 'pending')
                        <span class="status-badge status-pending">PENDING</span>
                    @else
                        <span class="status-badge status-unpaid">BELUM BAYAR</span>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    {{-- INFO BARIS --}}
    <table class="info-table">
        <tr>
            <td width="45%" valign="top">
                <div class="info-box">
                    <span class="info-box-label">Tagihan Kepada:</span>
                    <div class="info-box-value">{{ $bill->student->name }}</div>
                    <div class="info-box-sub">NIS: {{ $bill->student->nis ?? '-' }}</div>
                    @php
                        $kelas = $bill->student->academicClasses->where('pivot.is_active', true)->last();
                    @endphp
                    @if($kelas)
                    <div class="info-box-sub">Kelas: {{ $kelas->name }}</div>
                    @endif
                    @if($bill->student->parent_email)
                    <div class="info-box-sub">Email: {{ $bill->student->parent_email }}</div>
                    @endif
                </div>
            </td>
            <td width="5%"></td>
            <td width="25%" valign="top">
                <div class="info-box">
                    <span class="info-box-label">Tanggal Terbit:</span>
                    <div class="info-box-value">{{ $bill->created_at->format('d/m/Y') }}</div>
                </div>
            </td>
            <td width="5%"></td>
            <td width="20%" valign="top">
                <div class="info-box">
                    <span class="info-box-label">Periode:</span>
                    <div class="info-box-value">
                        @php
                            $bulanNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                        @endphp
                        {{ $bulanNames[$bill->month] ?? 'Bulan '.$bill->month }}
                    </div>
                    <div class="info-box-sub">Tahun {{ $bill->year }}</div>
                </div>
            </td>
        </tr>
    </table>

    {{-- RINCIAN TAGIHAN --}}
    <div class="section-title">Rincian Tagihan</div>
    <table class="detail">
        <thead>
            <tr>
                <th width="5%">No.</th>
                <th width="55%">Keterangan</th>
                <th width="20%">Periode</th>
                <th width="20%" class="text-right">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>{{ $bill->title }}</td>
                <td>Bulan {{ $bill->month }} / {{ $bill->year }}</td>
                <td class="text-right">Rp {{ number_format($bill->amount, 0, ',', '.') }}</td>
            </tr>
            @if(!empty($admin_fee) && $admin_fee['amount'] > 0)
            <tr>
                <td>2</td>
                <td>{{ $admin_fee['label'] }}</td>
                <td>-</td>
                <td class="text-right" style="color: #ea580c;">Rp {{ number_format($admin_fee['amount'], 0, ',', '.') }}</td>
            </tr>
            @endif
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" class="text-right">Total Pembayaran:</td>
                <td class="text-right total-amount">Rp {{ number_format($bill->amount + (!empty($admin_fee) ? $admin_fee['amount'] : 0), 0, ',', '.') }}</td>
            </tr>
        </tfoot>
    </table>

    {{-- INFO PEMBAYARAN (jika sudah lunas) --}}
    @if($bill->status === 'paid' && $bill->paid_at)
    <div class="paid-box">
        <table width="100%">
            <tr>
                <td width="50%">
                    <div class="paid-box-label">Tanggal Pembayaran:</div>
                    <div class="paid-box-value">{{ \Carbon\Carbon::parse($bill->paid_at)->format('d F Y, H:i') }} WIB</div>
                </td>
                <td width="50%">
                    <div class="paid-box-label">Metode Pembayaran:</div>
                    <div class="paid-box-value">
                        @php
                            $methodMap = array_merge([
                                'credit_card'   => 'Kartu Kredit',
                                'bank_transfer' => 'Transfer Bank (Virtual Account)',
                                'bca_va'        => 'BCA Virtual Account',
                                'bni_va'        => 'BNI Virtual Account',
                                'bri_va'        => 'BRI Virtual Account',
                                'permata_va'    => 'Permata Virtual Account',
                                'other_va'      => 'Virtual Account Lainnya',
                                'echannel'      => 'Mandiri Bill Payment',
                                'mandiri_bill'  => 'Mandiri Bill',
                                'bca_klikpay'   => 'BCA KlikPay',
                                'cimb_clicks'   => 'CIMB Clicks',
                                'bri_epay'      => 'BRI ePay',
                                'danamon_online'=> 'Danamon Online',
                                'qris'          => 'QRIS',
                                'gopay'         => 'GoPay',
                                'shopeepay'     => 'ShopeePay',
                                'akulaku'       => 'Akulaku',
                                'cstore'        => 'Gerai (Alfamart/Indomaret)',
                                'alfamart'      => 'Alfamart',
                                'indomaret'     => 'Indomaret',
                                'manual'        => 'Tunai (Cash)',
                            ], $method_labels ?? []);
                            $pm = $bill->payment_method;
                            $pmLabel = $pm ? ($methodMap[$pm] ?? ucwords(str_replace('_', ' ', $pm))) : 'Pembayaran Digital';
                        @endphp
                        {{ $pmLabel }}
                    </div>
                </td>
            </tr>
        </table>
    </div>
    @endif

    {{-- FOOTER --}}
    <div class="footer">
        <p>Dokumen ini dicetak secara otomatis oleh sistem SALIRA pada {{ now()->format('d F Y, H:i') }} WIB</p>
        <p style="margin-top:3px;">Jika ada pertanyaan, silakan hubungi pihak sekolah.</p>
    </div>

</div>
</body>
</html>
