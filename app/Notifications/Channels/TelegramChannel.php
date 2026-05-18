<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;

class TelegramChannel
{
    /**
     * Send the given notification.
     */
    public function send($notifiable, Notification $notification)
    {
        if (method_exists($notification, 'toTelegram')) {
            return $notification->toTelegram($notifiable);
        }
    }
}
