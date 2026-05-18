<?php

namespace App\Notifications;

use App\Models\Announcement;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Setting;
use App\Services\TelegramService;

class AnnouncementNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $announcement;

    /**
     * Create a new notification instance.
     */
    public function __construct(Announcement $announcement)
    {
        $this->announcement = $announcement;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];
        
        if ($this->announcement->type === 'important') {
            if (Setting::get('notif_channel_email', '1') === '1' && Setting::get('notif_announcement_email', '1') === '1') {
                $channels[] = 'mail';
            }
            if (Setting::get('notif_channel_whatsapp', '1') === '1' && Setting::get('notif_announcement_whatsapp', '1') === '1') {
                $phone = $notifiable->phone ?? $notifiable->parent_phone;
                if (!empty($phone)) $channels[] = \App\Notifications\Channels\WhatsAppChannel::class;
            }
            if (Setting::get('notif_channel_telegram', '1') === '1' && Setting::get('notif_announcement_telegram', '1') === '1') {
                $tgId = $notifiable->telegram_id ?? $notifiable->parent_telegram_id;
                if (!empty($tgId)) $channels[] = \App\Notifications\Channels\TelegramChannel::class;
            }
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->subject("PENGUMUMAN PENTING: " . $this->announcement->title)
                    ->greeting("Halo, {$notifiable->name}!")
                    ->line("Ada pengumuman penting baru dari sekolah:")
                    ->line("**{$this->announcement->title}**")
                    ->line($this->announcement->content)
                    ->action('Lihat Detail di Portal', url('/portal/dashboard'))
                    ->line('Terima kasih atas perhatiannya.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'announcement_id' => $this->announcement->id,
            'title' => $this->announcement->title,
            'message' => $this->announcement->title, // Consistent with Bell dropdown
            'type' => $this->announcement->type,
            'action_url' => '/dashboard',
        ];
    }

    private function parseTemplate($template)
    {
        $replacements = [
            '[JUDUL_PENGUMUMAN]' => $this->announcement->title,
            '[KONTEN]' => $this->announcement->content,
            '[LINK_LAMPIRAN]' => $this->announcement->attachment_path ? url('/storage/' . $this->announcement->attachment_path) : 'Tidak ada lampiran',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    public function toWhatsApp(object $notifiable)
    {
        $phone = $notifiable->phone ?? $notifiable->parent_phone;
        if (!$phone) return null;

        $template = Setting::get('tpl_wa_announcement', "📢 *PENGUMUMAN PENTING SALIRA*\n\n*[JUDUL_PENGUMUMAN]*\n\n[KONTEN]\n\n[LINK_LAMPIRAN]");
        $message = $this->parseTemplate($template);

        return [
            'phone' => $phone,
            'message' => $message
        ];
    }

    public function toTelegram(object $notifiable)
    {
        $targetId = $notifiable->telegram_id ?? $notifiable->parent_telegram_id;
        if (!$targetId) return;

        $template = Setting::get('tpl_tg_announcement', "<b>📢 PENGUMUMAN PENTING SALIRA</b>\n\n<b>[JUDUL_PENGUMUMAN]</b>\n\n[KONTEN]\n\n[LINK_LAMPIRAN]");
        $message = $this->parseTemplate($template);

        return app(TelegramService::class)->sendMessage($targetId, $message);
    }
}
