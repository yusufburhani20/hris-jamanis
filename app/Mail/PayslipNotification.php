<?php

namespace App\Mail;

use App\Models\Payroll;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PayslipNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $payroll;

    public function __construct(Payroll $payroll)
    {
        $this->payroll = $payroll;
    }

    public function envelope(): Envelope
    {
        $monthName = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni',
            7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ][$this->payroll->month];

        return new Envelope(
            subject: "[Bakmi SA] Slip Gaji Anda Periode {$monthName} {$this->payroll->year} Telah Terbit",
        );
    }

    public function content(): Content
    {
        $monthName = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni',
            7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ][$this->payroll->month];

        $employeeName = $this->payroll->user->name;
        
        // Penerimaan
        $basicSalary = number_format($this->payroll->basic_salary, 0, ',', '.');
        $tunjanganJabatan = number_format($this->payroll->tunjangan_jabatan, 0, ',', '.');
        $tunjanganMasaKerja = number_format($this->payroll->tunjangan_masa_kerja, 0, ',', '.');
        $tunjanganKesehatan = number_format($this->payroll->tunjangan_kesehatan, 0, ',', '.');
        $tunjanganKonsumsi = number_format($this->payroll->tunjangan_konsumsi, 0, ',', '.');
        $bonus = number_format($this->payroll->bonus, 0, ',', '.');
        $overtimePay = number_format($this->payroll->overtime_pay, 0, ',', '.');
        $totalPenerimaanVal = $this->payroll->basic_salary + $this->payroll->allowances + $this->payroll->overtime_pay;
        $totalPenerimaan = number_format($totalPenerimaanVal, 0, ',', '.');

        // Potongan
        $potonganAgniaCare = number_format($this->payroll->potongan_agnia_care, 0, ',', '.');
        $potonganBiayaKonsumsi = number_format($this->payroll->potongan_biaya_konsumsi, 0, ',', '.');
        $potonganBpjs = number_format($this->payroll->potongan_bpjs, 0, ',', '.');
        $potonganKehadiran = number_format($this->payroll->potongan_kehadiran, 0, ',', '.');
        $potonganKasbon = number_format($this->payroll->potongan_kasbon, 0, ',', '.');
        $totalPotonganVal = $this->payroll->deductions;
        $totalPotongan = number_format($totalPotonganVal, 0, ',', '.');

        $netSalary = number_format($this->payroll->net_salary, 0, ',', '.');

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Slip Gaji Bakmi SA</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
            <td style="background-color: #e11d48; padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">BAKMI SA</h1>
                <p style="color: #fecdd3; margin: 10px 0 0 0; font-size: 14px;">Slip Gaji Elektronik Karyawan</p>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 30px 24px;">
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #1e293b; line-height: 1.6;">Halo <strong>{$employeeName}</strong>,</p>
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">Slip gaji Anda untuk periode <strong>{$monthName} {$this->payroll->year}</strong> telah diterbitkan. Berikut rincian penerimaan dan potongan gaji Anda:</p>
                
                <!-- PENERIMAAN TABLE -->
                <table width="100%" style="border-collapse: collapse; margin-bottom: 24px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                            <th align="left" style="padding: 10px 12px; font-weight: 700; color: #334155; text-transform: uppercase;">1. Penerimaan</th>
                            <th align="right" style="padding: 10px 12px; font-weight: 700; color: #334155; text-transform: uppercase;">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Gaji Pokok</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$basicSalary}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Tunjangan Jabatan</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$tunjanganJabatan}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Tunjangan Masa Kerja</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$tunjanganMasaKerja}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Tunjangan Kesehatan</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$tunjanganKesehatan}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Tunjangan Konsumsi</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$tunjanganKonsumsi}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Lembur (Absensi + Unused Libur)</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$overtimePay}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Bonus</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$bonus}</td>
                        </tr>
                        <tr style="background-color: #f8fafc; font-weight: bold;">
                            <td style="padding: 10px 12px; color: #1e293b;">Total Penerimaan</td>
                            <td align="right" style="padding: 10px 12px; font-family: monospace; color: #0f766e;">Rp {$totalPenerimaan}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- POTONGAN TABLE -->
                <table width="100%" style="border-collapse: collapse; margin-bottom: 24px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                            <th align="left" style="padding: 10px 12px; font-weight: 700; color: #334155; text-transform: uppercase;">2. Potongan</th>
                            <th align="right" style="padding: 10px 12px; font-weight: 700; color: #334155; text-transform: uppercase;">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Agnia Care / Zakat</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$potonganAgniaCare}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Biaya Konsumsi (Mangkir)</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$potonganBiayaKonsumsi}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">BPJS</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$potonganBpjs}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Kehadiran (Mangkir + Terlambat)</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$potonganKehadiran}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; color: #475569;">Kasbon</td>
                            <td align="right" style="padding: 8px 12px; font-family: monospace; color: #334155;">Rp {$potonganKasbon}</td>
                        </tr>
                        <tr style="background-color: #f8fafc; font-weight: bold;">
                            <td style="padding: 10px 12px; color: #1e293b;">Total Potongan</td>
                            <td align="right" style="padding: 10px 12px; font-family: monospace; color: #b91c1c;">Rp {$totalPotongan}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- NET SALARY SUMMARY -->
                <table width="100%" style="border-collapse: collapse; margin-bottom: 30px; font-size: 14px; background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px;">
                    <tr>
                        <td style="padding: 16px; font-weight: 800; color: #9f1239;">JUMLAH BERSIH DITERIMA (NET)</td>
                        <td align="right" style="padding: 16px; font-family: monospace; font-weight: 800; color: #e11d48; font-size: 17px;">Rp {$netSalary}</td>
                    </tr>
                </table>

                <p style="margin: 0 0 24px 0; font-size: 13px; color: #475569; line-height: 1.6; text-align: center;">Slip gaji resmi dalam format PDF dapat diunduh kapan saja melalui portal karyawan HRIS Anda.</p>
                
                <!-- Button -->
                <table align="center" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="background-color: #e11d48; border-radius: 12px;">
                            <a href="/" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: 0.5px;">Buka Portal HRIS</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">Email ini dikirim secara otomatis oleh sistem HRIS Bakmi SA.</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">&copy; 2026 Bakmi SA. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;

        return new Content(
            htmlString: $html,
        );
    }
}
