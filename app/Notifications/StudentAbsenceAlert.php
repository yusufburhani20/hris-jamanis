<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Models\Setting;
use App\Services\TelegramService;

class StudentAbsenceAlert extends Notification implements ShouldQueue
{
    use Queueable;

    protected $student;
    protected $date;

    public function __construct($student, $date)
    {
        $this->student = $student;
        $this->date = $date;
    }

    public function via($notifiable): array
    {
        $channels = ['database'];
        if (Setting::get('notif_channel_telegram', '1') === '1' && Setting::get('notif_absence_telegram', '1') === '1') {
            if ($notifiable->parent_telegram_id) {
                $channels[] = \App\Notifications\Channels\TelegramChannel::class;
            }
        }
        if (Setting::get('notif_channel_whatsapp', '1') === '1' && Setting::get('notif_absence_whatsapp', '1') === '1') {
            if (!empty($notifiable->parent_phone)) {
                $channels[] = \App\Notifications\Channels\WhatsAppChannel::class;
            }
        }
        if (Setting::get('notif_channel_email', '1') === '1' && Setting::get('notif_absence_email', '1') === '1') {
            if (!empty($notifiable->parent_email)) {
                $channels[] = 'mail';
            }
        }
        return $channels;
    }

    private function parseTemplate($template, $notifiable)
    {
        $replacements = [
            '[NAMA_SISWA]' => $this->student->name,
            '[WAKTU]' => date('H:i'),
            '[LINK_PORTAL]' => url('/portal'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    public function toTelegram($notifiable)
    {
        $targetId = $notifiable->parent_telegram_id;
        if (!$targetId) return;

        $template = Setting::get('tpl_tg_absence', "<b>🚨 PERINGATAN ABSENSI</b>\n\nBapak/Ibu wali dari <b>[NAMA_SISWA]</b>,\nKami informasikan bahwa hingga pukul <b>[WAKTU]</b>, anak Anda belum tercatat melakukan presensi kehadiran di sekolah.\n\nMohon konfirmasinya melalui portal atau hubungi wali kelas.\n<a href='[LINK_PORTAL]'>Portal Siswa</a>");
        $message = $this->parseTemplate($template, $notifiable);

        return app(TelegramService::class)->sendMessage($targetId, $message);
    }

    public function toArray($notifiable): array
    {
        return [
            'title' => 'Peringatan Kehadiran',
            'message' => "Siswa {$this->student->name} belum tercatat hadir hari ini.",
            'type' => 'warning',
            'student_id' => $this->student->id,
            'action_url' => '/portal/attendance',
        ];
    }

    public function toWhatsApp($notifiable)
    {
        if (empty($notifiable->parent_phone)) return null;

        $template = Setting::get('tpl_wa_absence', "🚨 *PERINGATAN ABSENSI*\n\nBapak/Ibu wali dari *[NAMA_SISWA]*,\nKami informasikan bahwa hingga pukul *[WAKTU]*, anak Anda belum tercatat melakukan presensi kehadiran di sekolah.\n\nMohon konfirmasinya melalui portal atau hubungi wali kelas.\n[LINK_PORTAL]");
        $message = $this->parseTemplate($template, $notifiable);

        return [
            'phone' => $notifiable->parent_phone,
            'message' => $message
        ];
    }

    public function toMail($notifiable)
    {
        if (empty($notifiable->parent_email)) return null;

        return (new MailMessage)
            ->subject('Peringatan Absensi SALIRA')
            ->greeting("Halo Bapak/Ibu wali dari {$this->student->name},")
            ->line("Kami informasikan bahwa hingga pukul " . date('H:i') . ", anak Anda belum tercatat melakukan presensi kehadiran di sekolah.")
            ->line("Mohon konfirmasi status kehadiran anak Anda melalui portal kami.")
            ->action('Buka Portal Siswa', url('/portal'));
    }
}
