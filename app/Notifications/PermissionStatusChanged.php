<?php

namespace App\Notifications;

use App\Models\PermissionRequest;
use App\Services\TelegramService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Setting;

class PermissionStatusChanged extends Notification
{
    use Queueable;

    protected $permission;

    /**
     * Create a new notification instance.
     */
    public function __construct(PermissionRequest $permission)
    {
        $this->permission = $permission;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (Setting::get('notif_channel_email', '1') === '1' && Setting::get('notif_permission_status_email', '1') === '1') {
            $channels[] = 'mail';
        }

        if (Setting::get('notif_channel_telegram', '1') === '1' && Setting::get('notif_permission_status_telegram', '1') === '1') {
            if ($notifiable->telegram_id) {
                $channels[] = \App\Notifications\Channels\TelegramChannel::class;
            }
        }

        if (Setting::get('notif_channel_whatsapp', '1') === '1' && Setting::get('notif_permission_status_whatsapp', '1') === '1') {
            if (!empty($notifiable->phone)) {
                $channels[] = \App\Notifications\Channels\WhatsAppChannel::class;
            }
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $statusStr = strtoupper($this->permission->status->label());
        $typeLabel = $this->permission->type->label();
        $reason = $this->permission->rejection_reason ? "\nAlasan: " . $this->permission->rejection_reason : "";

        return (new MailMessage)
                    ->subject("Status Pengajuan Izin: {$statusStr}")
                    ->greeting("Halo, {$notifiable->name}!")
                    ->line("Status pengajuan izin Anda ({$typeLabel}) pada tanggal " . $this->permission->start_date->format('d/m/Y') . " telah diperbarui.")
                    ->line("Status Saat Ini: **{$statusStr}**")
                    ->line($reason)
                    ->action('Lihat Detail', url('/permissions'))
                    ->line('Terima kasih telah menggunakan aplikasi SALIRA!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'permission_id' => $this->permission->id,
            'type' => $this->permission->type->value,
            'status' => $this->permission->status->value,
            'message' => "Pengajuan izin " . $this->permission->type->label() . " Anda telah " . strtolower($this->permission->status->label()),
            'action_url' => '/permissions',
        ];
    }

    private function parseTemplate($template, $notifiable, $isWhatsApp = true)
    {
        $statusStr = $this->permission->status->value === 'approved' 
            ? ($isWhatsApp ? '✅ *DITERIMA*' : '✅ <b>DITERIMA</b>') 
            : ($isWhatsApp ? '❌ *DITOLAK*' : '❌ <b>DITOLAK</b>');
            
        $typeLabel = $this->permission->type->label();
        
        $reason = "";
        if ($this->permission->rejection_reason) {
            $reason = $isWhatsApp 
                ? "\n_Alasan: " . $this->permission->rejection_reason . "_"
                : "\n<i>Alasan: " . $this->permission->rejection_reason . "</i>";
        }

        $replacements = [
            '[NAMA_PEMOHON]' => $notifiable->name,
            '[TIPE_IZIN]' => $typeLabel,
            '[TANGGAL]' => $this->permission->start_date->format('d/m/Y'),
            '[STATUS]' => $statusStr,
            '[ALASAN_TOLAK]' => $reason,
            '[LINK_PORTAL]' => url('/permissions'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    public function toTelegram(object $notifiable)
    {
        if (!$notifiable->telegram_id) return;

        $template = Setting::get('tpl_tg_permission_status', "<b>📝 Status Pengajuan Izin</b>\n\nHalo <b>[NAMA_PEMOHON]</b>,\nPengajuan izin <b>[TIPE_IZIN]</b> Anda pada tanggal <b>[TANGGAL]</b> telah diperbarui.\n\n<b>Status:</b> [STATUS]\n[ALASAN_TOLAK]\n\nSilakan cek dashboard untuk detail lebih lanjut.");
        $message = $this->parseTemplate($template, $notifiable, false);

        return app(TelegramService::class)->sendMessage($notifiable->telegram_id, $message);
    }

    public function toWhatsApp(object $notifiable)
    {
        if (empty($notifiable->phone)) return null;

        $template = Setting::get('tpl_wa_permission_status', "📝 *Status Pengajuan Izin*\n\nHalo *[NAMA_PEMOHON]*,\nPengajuan izin *[TIPE_IZIN]* Anda pada tanggal *[TANGGAL]* telah diperbarui.\n\n*Status:* [STATUS]\n[ALASAN_TOLAK]\n\nSilakan cek portal untuk detail lebih lanjut.\n[LINK_PORTAL]");
        $message = $this->parseTemplate($template, $notifiable, true);

        return [
            'phone' => $notifiable->phone,
            'message' => $message
        ];
    }
}
