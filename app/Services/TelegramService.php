<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected $token;
    protected $baseUrl;

    public function __construct()
    {
        $this->token = config('services.telegram.bot_token');
        $this->baseUrl = "https://api.telegram.org/bot{$this->token}";
    }

    /**
     * Send a text message to a chat ID.
     */
    public function sendMessage($chatId, $message, $parseMode = 'HTML')
    {
        if (empty($this->token)) {
            Log::warning('Telegram Bot Token is not set in .env');
            return false;
        }

        try {
            $response = Http::post("{$this->baseUrl}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => $parseMode,
            ]);

            if ($response->successful()) {
                return true;
            }

            Log::error('Telegram API Error: ' . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error('Telegram Exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Send a notification to a user or parent.
     */
    public function notify($targetId, $message)
    {
        // This helper assumes targetId is the Chat ID
        return $this->sendMessage($targetId, $message);
    }
}
