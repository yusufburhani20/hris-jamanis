<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\PermissionRequest;
use App\Models\Setting;
use App\Services\TelegramService;

class NewPermissionRequest extends Notification
{
    use Queueable;

    public $permissionRequest;

    /**
     * Create a new notification instance.
     */
    public function __construct(PermissionRequest $permissionRequest)
    {
        $this->permissionRequest = $permissionRequest;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (Setting::get('notif_channel_email', '1') === '1' && Setting::get('notif_permission_req_email', '1') === '1') {
            $channels[] = 'mail';
        }
        if (Setting::get('notif_channel_telegram', '1') === '1' && Setting::get('notif_permission_req_telegram', '0') === '1') {
            if ($notifiable->telegram_id) {
                $channels[] = \App\Notifications\Channels\TelegramChannel::class;
            }
        }
        if (Setting::get('notif_channel_whatsapp', '1') === '1' && Setting::get('notif_permission_req_whatsapp', '1') === '1') {
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
        $typeLabel = $this->permissionRequest->type instanceof \App\Enums\PermissionType 
            ? $this->permissionRequest->type->label() 
            : $this->permissionRequest->type;

        $requesterName = $this->permissionRequest->user->name ?? $this->permissionRequest->student->name ?? 'Pemohon';

        return (new MailMessage)
            ->subject('Pengajuan Izin Baru: ' . $requesterName)
            ->greeting('Halo ' . $notifiable->name . ',')
            ->line('Terdapat pengajuan ' . $typeLabel . ' baru dari ' . $requesterName . '.')
            ->line('Alasan: ' . $this->permissionRequest->reason)
            ->action('Lihat Pengajuan', url('/admin/approvals'))
            ->line('Terima kasih telah menggunakan sistem SALIRA!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $typeLabel = $this->permissionRequest->type instanceof \App\Enums\PermissionType 
            ? $this->permissionRequest->type->label() 
            : $this->permissionRequest->type;

        $requesterName = $this->permissionRequest->user->name ?? $this->permissionRequest->student->name ?? 'Pemohon';

        return [
            'permission_id' => $this->permissionRequest->id,
            'user_name' => $requesterName,
            'type' => $typeLabel,
            'message' => $requesterName . ' mengajukan ' . $typeLabel . ' baru.',
            'action_url' => '/admin/approvals',
        ];
    }

    private function parseTemplate($template, $notifiable)
    {
        $typeLabel = $this->permissionRequest->type instanceof \App\Enums\PermissionType 
            ? $this->permissionRequest->type->label() 
            : $this->permissionRequest->type;

        $replacements = [
            '[NAMA_ADMIN]' => $notifiable->name,
            '[TIPE_IZIN]' => $typeLabel,
            '[NAMA_PEMOHON]' => $this->permissionRequest->user->name ?? $this->permissionRequest->student->name,
            '[ALASAN]' => $this->permissionRequest->reason,
            '[LINK_APPROVAL]' => url('/admin/approvals'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    public function toTelegram(object $notifiable)
    {
        $targetId = $notifiable->telegram_id;
        if (!$targetId) return;

        $template = Setting::get('tpl_tg_permission_req', "<b>📝 Pengajuan Izin Baru</b>\n\nHalo <b>[NAMA_ADMIN]</b>,\nTerdapat pengajuan <b>[TIPE_IZIN]</b> baru dari <b>[NAMA_PEMOHON]</b>.\n\nAlasan: <i>[ALASAN]</i>\n\nSilakan cek di portal untuk menyetujui atau menolak pengajuan ini.\n<a href='[LINK_APPROVAL]'>Buka Approval</a>");
        $message = $this->parseTemplate($template, $notifiable);

        return app(TelegramService::class)->sendMessage($targetId, $message);
    }

    public function toWhatsApp(object $notifiable)
    {
        if (empty($notifiable->phone)) return null;

        $template = Setting::get('tpl_wa_permission_req', "📝 *Pengajuan Izin Baru*\n\nHalo *[NAMA_ADMIN]*,\nTerdapat pengajuan *[TIPE_IZIN]* baru dari *[NAMA_PEMOHON]*.\n\nAlasan: _[ALASAN]_\n\nSilakan cek di portal untuk menyetujui atau menolak pengajuan ini.\n[LINK_APPROVAL]");
        $message = $this->parseTemplate($template, $notifiable);

        return [
            'phone' => $notifiable->phone,
            'message' => $message
        ];
    }
}
