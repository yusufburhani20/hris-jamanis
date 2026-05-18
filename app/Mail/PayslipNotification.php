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
            subject: "[HRIS Enterprise] Slip Gaji Anda Periode {$monthName} {$this->payroll->year} Telah Terbit",
        );
    }

    public function content(): Content
    {
        $monthName = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni',
            7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ][$this->payroll->month];

        $employeeName = $this->payroll->user->name;
        $basicSalary = number_format($this->payroll->basic_salary, 0, ',', '.');
        $allowances = number_format($this->payroll->allowances, 0, ',', '.');
        $overtimePay = number_format($this->payroll->overtime_pay, 0, ',', '.');
        $deductions = number_format($this->payroll->deductions, 0, ',', '.');
        $netSalary = number_format($this->payroll->net_salary, 0, ',', '.');

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Slip Gaji Terbit</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
            <td style="background-color: #4f46e5; padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">HRIS ENTERPRISE</h1>
                <p style="color: #c7d2fe; margin: 10px 0 0 0; font-size: 14px;">Pemberitahuan Slip Gaji Elektronik</p>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #334155; line-height: 1.6;">Halo <strong>{$employeeName}</strong>,</p>
                <p style="margin: 0 0 30px 0; font-size: 14px; color: #475569; line-height: 1.6;">Slip gaji resmi Anda untuk periode <strong>{$monthName} {$this->payroll->year}</strong> telah diterbitkan dan telah dikirim ke rekening terdaftar Anda. Berikut adalah ringkasan penerimaan gaji bersih Anda:</p>
                
                <!-- Rincian -->
                <table width="100%" style="border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                        <td style="padding: 12px 0; color: #64748b;">Gaji Pokok</td>
                        <td align="right" style="padding: 12px 0; font-family: monospace; font-weight: bold; color: #334155;">Rp {$basicSalary}</td>
                    </tr>
                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                        <td style="padding: 12px 0; color: #64748b;">Tunjangan Kerja</td>
                        <td align="right" style="padding: 12px 0; font-family: monospace; font-weight: bold; color: #10b981;">+Rp {$allowances}</td>
                    </tr>
                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                        <td style="padding: 12px 0; color: #64748b;">Upah Lembur</td>
                        <td align="right" style="padding: 12px 0; font-family: monospace; font-weight: bold; color: #4f46e5;">+Rp {$overtimePay}</td>
                    </tr>
                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                        <td style="padding: 12px 0; color: #64748b; color: #ef4444;">Potongan Kehadiran</td>
                        <td align="right" style="padding: 12px 0; font-family: monospace; font-weight: bold; color: #ef4444;">-Rp {$deductions}</td>
                    </tr>
                    <tr style="background-color: #f8fafc;">
                        <td style="padding: 16px; font-weight: 800; color: #1e293b; border-radius: 8px 0 0 8px;">GAJI BERSIH (NET)</td>
                        <td align="right" style="padding: 16px; font-family: monospace; font-weight: 800; color: #4f46e5; border-radius: 0 8px 8px 0; font-size: 16px;">Rp {$netSalary}</td>
                    </tr>
                </table>

                <p style="margin: 0 0 30px 0; font-size: 14px; color: #475569; line-height: 1.6; text-align: center;">Slip gaji dalam format PDF resmi sudah tersedia dan dapat diunduh kapan saja melalui portal karyawan HRIS Anda.</p>
                
                <!-- Button -->
                <table align="center" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="background-color: #4f46e5; border-radius: 12px;">
                            <a href="/" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: -0.2px;">Buka Portal HRIS</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">Email ini dikirim secara otomatis oleh sistem HRIS Enterprise.</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">&copy; 2026 Enterprise HRIS. All rights reserved.</p>
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
