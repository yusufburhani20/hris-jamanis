<?php

namespace App\Notifications;

use App\Models\Bill;
use App\Services\TelegramService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Setting;

class BillGeneratedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $bill;

    /**
     * Create a new notification instance.
     */
    public function __construct(Bill $bill)
    {
        $this->bill = $bill;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (Setting::get('notif_channel_email', '1') === '1' && Setting::get('notif_bill_generated_email', '1') === '1') {
            if (!empty($notifiable->parent_email)) {
                $channels[] = 'mail';
            }
        }
        if (Setting::get('notif_channel_telegram', '1') === '1' && Setting::get('notif_bill_generated_telegram', '1') === '1') {
            if ($notifiable->telegram_id || $notifiable->parent_telegram_id) {
                $channels[] = \App\Notifications\Channels\TelegramChannel::class;
            }
        }
        if (Setting::get('notif_channel_whatsapp', '1') === '1' && Setting::get('notif_bill_generated_whatsapp', '1') === '1') {
            if (!empty($notifiable->phone) || !empty($notifiable->parent_phone)) {
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
        $amount = number_format($this->bill->amount, 0, ',', '.');
        $url = url('/invoice/' . $this->bill->bill_number);

        return (new MailMessage)
                    ->subject("Tagihan SPP " . $this->bill->title)
                    ->greeting("Halo, Bapak/Ibu dari {$notifiable->name}!")
                    ->line("Ini adalah pengingat bahwa tagihan {$this->bill->title} sebesar Rp {$amount} telah diterbitkan dan belum dibayarkan.")
                    ->action('Bayar Sekarang', $url)
                    ->line('Terima kasih atas partisipasi Anda mendukung pendidikan di institusi kami.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'bill_id' => $this->bill->id,
            'amount' => $this->bill->amount,
            'message' => "Tagihan {$this->bill->title} baru saja diterbitkan.",
            'action_url' => '/admin/bills',
        ];
    }

    private function parseTemplate($template, $notifiable)
    {
        $amount = number_format($this->bill->amount, 0, ',', '.');
        $url = url('/invoice/' . $this->bill->bill_number);

        $replacements = [
            '[NAMA_SISWA]' => $notifiable->name,
            '[NAMA_TAGIHAN]' => $this->bill->title,
            '[NOMINAL]' => "Rp {$amount}",
            '[LINK_INVOICE]' => $url,
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    /**
     * Trigger Telegram Notification
     */
    public function toTelegram(object $notifiable)
    {
        // Handle target telegram_id (bisa dari user/pegawai atau parent/student)
        $targetId = $notifiable->parent_telegram_id ?? $notifiable->telegram_id;
        if (!$targetId) return;

        $template = Setting::get('tpl_tg_bill_generated', "<b>⚠️ TAGIHAN BARU SALIRA</b>\n\nBapak/Ibu wali dari <b>[NAMA_SISWA]</b>,\nTagihan <b>[NAMA_TAGIHAN]</b> sebesar <b>[NOMINAL]</b> telah diterbitkan.\n\nHarap segera melakukan pembayaran melalui tautan web di bawah ini:\n<a href='[LINK_INVOICE]'>Lihat & Bayar Tagihan</a>\n\nTerima kasih.");
        $message = $this->parseTemplate($template, $notifiable);

        return app(TelegramService::class)->sendMessage($targetId, $message);
    }

    /**
     * Trigger WhatsApp Notification
     */
    public function toWhatsApp(object $notifiable)
    {
        $phone = $notifiable->parent_phone ?? $notifiable->phone;
        if (!$phone) return null;

        $template = Setting::get('tpl_wa_bill_generated', "⚠️ *TAGIHAN BARU SALIRA*\n\nBapak/Ibu wali dari *[NAMA_SISWA]*,\nTagihan *[NAMA_TAGIHAN]* sebesar *[NOMINAL]* telah diterbitkan.\n\nHarap segera melakukan pembayaran melalui tautan web di bawah ini:\n[LINK_INVOICE]\n\nTerima kasih.");
        $message = $this->parseTemplate($template, $notifiable);

        return [
            'phone' => $phone,
            'message' => $message
        ];
    }
}
