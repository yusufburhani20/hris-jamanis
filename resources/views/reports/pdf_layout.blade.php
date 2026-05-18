<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
        .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .school-logo { width: 70px; height: 70px; object-fit: contain; filter: grayscale(100%); }
        .school-name { font-size: 20px; font-weight: bold; margin: 0; color: #000; text-transform: uppercase; }
        .report-title { font-size: 14px; margin: 5px 0 0; color: #000; font-weight: bold; letter-spacing: 1px; }
        .school-address { font-size: 9px; color: #333; margin-top: 5px; }
        .clear { clear: both; }
        .meta { margin-bottom: 15px; font-size: 10px; background: #fff; padding: 10px; border: 1px solid #000; }
        .meta table { width: 100%; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        table.data th { background: #eee; border: 1px solid #000; padding: 6px; text-align: left; font-weight: bold; font-size: 9px; text-transform: uppercase; color: #000; }
        table.data td { border: 1px solid #000; padding: 5px; font-size: 9px; vertical-align: top; word-wrap: break-word; color: #000; }
        .status-hadir { color: #000; font-weight: bold; }
        .status-sakit { color: #000; }
        .status-izin { color: #000; }
        .status-alpha { color: #000; font-weight: bold; }
        .status-terlambat { color: #000; }
        .text-center { text-align: center; }
        .footer { position: fixed; bottom: -20px; left: 0; right: 0; height: 20px; font-size: 8px; text-align: right; color: #333; border-top: 1px solid #000; padding-top: 5px; }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            @if(isset($logo) && $logo)
            <td width="80">
                <img src="{{ $logo }}" class="school-logo">
            </td>
            @endif
            <td style="vertical-align: middle;">
                <h1 class="school-name">{{ $school_name }}</h1>
                <p class="report-title">{{ $title }}</p>
                @if(isset($school_address))
                    <p class="school-address">{{ $school_address }}</p>
                @endif
            </td>
            <td width="150" style="text-align: right; vertical-align: bottom; font-size: 8px; color: #94a3b8;">
                Dicetak: {{ date('d/m/Y H:i') }}
            </td>
        </tr>
    </table>

    <div class="meta">
        <table>
            <tr>
                <td width="10%">Kelas:</td>
                <td width="40%"><strong>{{ $class_name ?? 'Semua Kelas' }}</strong></td>
                <td width="10%">Periode:</td>
                <td width="40%"><strong>{{ $range }}</strong></td>
            </tr>
            @if(isset($subject_name))
            <tr>
                <td>Mapel:</td>
                <td colspan="3"><strong>{{ $subject_name }}</strong></td>
            </tr>
            @endif
        </table>
    </div>

    @yield('content')

    <div class="footer">
        Dicetak pada: {{ date('d/m/Y H:i') }} | SALIRA Integrated System
    </div>
</body>
</html>
