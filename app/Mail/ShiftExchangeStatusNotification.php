<?php

namespace App\Mail;

use App\Models\ShiftExchangeRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ShiftExchangeStatusNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $exchange;

    public function __construct(ShiftExchangeRequest $exchange)
    {
        $this->exchange = $exchange;
    }

    public function envelope(): Envelope
    {
        $statusText = $this->exchange->status === 'approved' ? 'DISETUJUI' : 'DITOLAK';
        return new Envelope(
            subject: "[HRIS Enterprise] Status Pengajuan Tukar Shift Anda: {$statusText}",
        );
    }

    public function content(): Content
    {
        $employeeName = $this->exchange->user->name;
        $targetDate = $this->exchange->target_date->format('d M Y');
        $status = $this->exchange->status;
        $statusLabel = $status === 'approved' ? 'DISETUJUI' : 'DITOLAK';
        $statusColor = $status === 'approved' ? '#10b981' : '#ef4444';
        $statusBg = $status === 'approved' ? '#d1fae5' : '#fee2e2';
        $rejectionReason = e($this->exchange->rejection_reason ?? '');
        $type = $this->exchange->type === 'employee' ? 'Tukar dengan Rekan Kerja' : 'Ganti Shift Mandiri';

        $fromShiftText = "{$this->exchange->fromShift->name} ({$this->exchange->fromShift->start_time} - {$this->exchange->fromShift->end_time})";
        
        $toShiftText = "";
        if ($this->exchange->type === 'shift') {
            $toShiftText = "{$this->exchange->toShift->name} ({$this->exchange->toShift->start_time} - {$this->exchange->toShift->end_time})";
        } else {
            $colleagueName = $this->exchange->targetUser->name;
            $colleagueShift = "{$this->exchange->targetUserFromShift->name} ({$this->exchange->targetUserFromShift->start_time} - {$this->exchange->targetUserFromShift->end_time})";
            $toShiftText = "Tukar dengan <strong>{$colleagueName}</strong> (Shift asli rekan: {$colleagueShift})";
        }

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Status Pengajuan Tukar Shift</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
            <td style="background-color: #6366f1; padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">HRIS ENTERPRISE</h1>
                <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">Status Permohonan Tukar Shift</p>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 40px 30px;">
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #334155; line-height: 1.6;">Halo <strong>{$employeeName}</strong>,</p>
                <p style="margin: 0 0 30px 0; font-size: 14px; color: #475569; line-height: 1.6;">Permohonan penukaran shift yang Anda ajukan telah selesai diproses oleh tim HRD dengan status berikut:</p>
                
                <!-- Status Box -->
                <div style="background-color: {$statusBg}; color: {$statusColor}; border: 2px solid {$statusColor}; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <span style="font-size: 18px; font-weight: 900; letter-spacing: 1px; display: block; text-transform: uppercase;">{$statusLabel}</span>
                </div>

                <!-- Rincian -->
                <table width="100%" style="border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold; width: 150px;">Jenis Tukar Shift</td>
                        <td style="padding: 12px 0; color: #334155;">{$type}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold;">Tanggal Target</td>
                        <td style="padding: 12px 0; color: #334155; font-family: monospace;">{$targetDate}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold;">Shift Asal</td>
                        <td style="padding: 12px 0; color: #ef4444;">{$fromShiftText}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold;">Shift Baru / Target</td>
                        <td style="padding: 12px 0; color: #10b981;">{$toShiftText}</td>
                    </tr>
                    
                    {if $status === 'rejected' && !empty($rejectionReason)}
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 0; color: #64748b; font-weight: bold; vertical-align: top;">Alasan Penolakan</td>
                        <td style="padding: 12px 0; color: #ef4444; font-weight: bold;">{$rejectionReason}</td>
                    </tr>
                    {endif}
                </table>

                <p style="margin: 0 0 30px 0; font-size: 14px; color: #475569; line-height: 1.6; text-align: center;">Silakan login ke portal karyawan HRIS Anda untuk melihat detail jadwal shift Anda yang diperbarui.</p>
                
                <!-- Button -->
                <table align="center" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="background-color: #6366f1; border-radius: 12px;">
                            <a href="/shift-exchanges" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; letter-spacing: -0.2px;">Lihat Riwayat Shift Saya</a>
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

        // Custom template parse replacement for simple blade-like syntax in PHP variable
        $html = str_replace(
            $status === 'rejected' && !empty($rejectionReason) 
                ? ['{if $status === \'rejected\' && !empty($rejectionReason)}', '{endif}'] 
                : [],
            '', 
            $html
        );
        
        // Remove structural if tags if it wasn't rejected
        if ($status !== 'rejected') {
            $html = preg_replace('/\{if \$status === \'rejected\' && !empty\(\$rejectionReason\)\}.*?\{endif\}/s', '', $html);
        }

        return new Content(
            htmlString: $html,
        );
    }
}
