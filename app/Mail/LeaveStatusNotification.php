<?php

namespace App\Mail;

use App\Models\Leave;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeaveStatusNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $leave;

    public function __construct(Leave $leave)
    {
        $this->leave = $leave;
    }

    public function envelope(): Envelope
    {
        $statusLabel = $this->leave->status === 'approved' ? 'DISETUJUI' : 'DITOLAK';
        return new Envelope(
            subject: "[HRIS Enterprise] Pengajuan Izin/Cuti Anda {$statusLabel}",
        );
    }

    public function content(): Content
    {
        $employeeName = $this->leave->user->name;
        $type = ucfirst($this->leave->type);
        $startDate = $this->leave->start_date->format('d M Y');
        $endDate = $this->leave->end_date->format('d M Y');
        $status = ucfirst($this->leave->status);
        $statusColor = $this->leave->status === 'approved' ? '#10b981' : '#ef4444';
        $reason = e($this->leave->reason);

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Pembaruan Status Pengajuan Izin</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
            <td style="background-color: #f59e0b; padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">HRIS ENTERPRISE</h1>
                <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 14px;">Status Pengajuan Izin / Cuti</p>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #334155; line-height: 1.6;">Halo <strong>{$employeeName}</strong>,</p>
                <p style="margin: 0 0 30px 0; font-size: 14px; color: #475569; line-height: 1.6;">Pengajuan permohonan ketidakhadiran Anda telah diperbarui oleh HR Admin. Berikut rinciannya:</p>
                
                <!-- Rincian -->
                <table width="100%" style="border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold; width: 140px;">Jenis Pengajuan</td>
                        <td style="padding: 12px 0; color: #334155;">
                            <span style="background-color: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold;">{$type}</span>
                        </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold;">Mulai Tanggal</td>
                        <td style="padding: 12px 0; color: #334155; font-family: monospace;">{$startDate}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold;">Hingga Tanggal</td>
                        <td style="padding: 12px 0; color: #334155; font-family: monospace;">{$endDate}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold;">Status</td>
                        <td style="padding: 12px 0; color: {$statusColor}; font-weight: bold;">
                            {$status}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold; vertical-align: top;">Alasan Pengajuan</td>
                        <td style="padding: 12px 0; color: #334155; line-height: 1.5;">{$reason}</td>
                    </tr>
                </table>

                <p style="margin: 0 0 30px 0; font-size: 14px; color: #475569; line-height: 1.6; text-align: center;">Silakan login ke portal HRIS Anda untuk melihat detail lebih lanjut.</p>
                
                <!-- Button -->
                <table align="center" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="background-color: #f59e0b; border-radius: 12px;">
                            <a href="/leaves" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: -0.2px;">Buka Panel Cuti Saya</a>
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
