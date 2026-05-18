<?php

namespace App\Notifications;

use App\Models\Student;
use App\Models\User;
use App\Models\Setting;
use App\Services\TelegramService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class StudentReportNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $student;
    protected $sender;
    protected $startDate;
    protected $endDate;
    protected $reportData;

    /**
     * Create a new notification instance.
     */
    public function __construct(Student $student, User $sender, string $startDate, string $endDate, array $reportData)
    {
        $this->student = $student;
        $this->sender = $sender;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->reportData = $reportData;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (Setting::get('notif_channel_email', '1') === '1' && Setting::get('notif_student_report_email', '1') === '1') {
            if ($notifiable->parent_email) {
                $channels[] = 'mail';
            }
        }
        
        if (Setting::get('notif_channel_telegram', '1') === '1' && Setting::get('notif_student_report_telegram', '1') === '1') {
            if ($notifiable->parent_telegram_id) {
                $channels[] = \App\Notifications\Channels\TelegramChannel::class;
            }
        }

        if (Setting::get('notif_channel_whatsapp', '1') === '1' && Setting::get('notif_student_report_whatsapp', '1') === '1') {
            if ($notifiable->parent_phone) {
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
        // Settings for PDF
        $settings = [
            'school_name'    => Setting::get('school_name', 'SALIRA ACADEMY'),
            'school_address' => Setting::get('school_address', 'Alamat Sekolah Belum Diatur'),
            'school_phone'   => Setting::get('school_phone', '-'),
            'school_email'   => Setting::get('school_email', '-'),
            'report_location'=> Setting::get('report_location', 'Kota'),
            'school_logo'    => Setting::get('school_logo'),
            'title'          => 'LAPORAN PERKEMBANGAN SISWA (RESUME)',
            'range'          => $this->reportData['range'] ?? "{$this->startDate} s/d {$this->endDate}",
        ];

        $pdf = Pdf::loadView('reports.student_resume_pdf', array_merge($settings, $this->reportData))
            ->setPaper('a4', 'portrait');

        $fileName = "Laporan_{$notifiable->name}.pdf";
        
        return (new MailMessage)
            ->subject("Laporan Perkembangan {$notifiable->name}")
            ->greeting("Yth. Bapak/Ibu wali dari {$notifiable->name}")
            ->line("Berikut kami lampirkan laporan perkembangan putra/putri Anda untuk periode {$this->startDate} sampai {$this->endDate}.")
            ->line("Laporan ini berisi detail absensi, nilai asesmen, dan catatan bimbingan (jika ada).")
            ->line("Dikirim oleh Wali Kelas: {$this->sender->name}")
            ->attachData($pdf->output(), $fileName, [
                'mime' => 'application/pdf',
            ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'student_id' => $this->student->id,
            'message' => "Laporan dikirim ke orang tua untuk periode {$this->startDate} - {$this->endDate}",
            'sender_id' => $this->sender->id,
            'action_url' => '/admin/reports/student-resume',
        ];
    }

    private function parseTemplate($template, $notifiable)
    {
        $attendanceStr = "";
        if (isset($this->reportData['attendance'])) {
            $att = $this->reportData['attendance'];
            $attendanceStr = "Kehadiran: {$att['percentage']}%\n(Hadir: {$att['hadir']}, Sakit: {$att['sakit']}, Izin: {$att['izin']}, Alpha: {$att['alpha']})";
        }

        $replacements = [
            '[NAMA_SISWA]' => $notifiable->name,
            '[PESAN_WALI]' => "Periode Laporan: {$this->startDate} s/d {$this->endDate}\n\n{$attendanceStr}",
            '[LINK_PDF]' => 'Silakan cek email Anda untuk mengunduh lampiran file PDF.',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    public function toWhatsApp(object $notifiable)
    {
        $targetId = $notifiable->parent_phone;
        if (!$targetId) return null;

        $template = Setting::get('tpl_wa_student_report', "📊 *LAPORAN PERKEMBANGAN SISWA*\n\nHalo Bapak/Ibu wali dari *[NAMA_SISWA]*,\nWali kelas telah mengirimkan ringkasan perkembangan belajar anak Anda.\n\n*[PESAN_WALI]*\n\nSilakan download dokumen laporan selengkapnya di bawah ini:\n[LINK_PDF]");
        $message = $this->parseTemplate($template, $notifiable);

        return [
            'phone' => $targetId,
            'message' => $message
        ];
    }

    public function toTelegram(object $notifiable)
    {
        $targetId = $notifiable->parent_telegram_id;
        if (!$targetId) return;

        $template = Setting::get('tpl_tg_student_report', "<b>📊 LAPORAN PERKEMBANGAN SISWA</b>\n\nHalo Bapak/Ibu wali dari <b>[NAMA_SISWA]</b>,\nWali kelas telah mengirimkan ringkasan perkembangan belajar anak Anda.\n\n<b>[PESAN_WALI]</b>\n\nSilakan download dokumen laporan selengkapnya di bawah ini:\n<a href='[LINK_PDF]'>Download Laporan</a>");
        $message = $this->parseTemplate($template, $notifiable);

        return app(TelegramService::class)->sendMessage($targetId, $message);
    }
}
