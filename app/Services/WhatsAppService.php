<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected $baseUrl;

    public function __construct()
    {
        $this->baseUrl = env('WHATSAPP_GATEWAY_URL', 'http://localhost:3000');
    }

    /**
     * Send a WhatsApp message
     * 
     * @param string $phone Target phone number (e.g., 0812345678 or 62812345678)
     * @param string $message The message content
     * @return bool
     */
    public function sendMessage($phone, $message)
    {
        try {
            $response = Http::post("{$this->baseUrl}/send-message", [
                'phone' => $phone,
                'message' => $message
            ]);

            if ($response->successful()) {
                return true;
            }

            Log::error('WhatsApp Gateway Error: ' . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error('WhatsApp Service Exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Check gateway status
     */
    public function getStatus()
    {
        try {
            $response = Http::get("{$this->baseUrl}/status");
            return $response->json();
        } catch (\Exception $e) {
            return ['status' => 'offline', 'error' => $e->getMessage()];
        }
    }

    /**
     * Restart the WhatsApp Gateway client
     */
    public function restart()
    {
        try {
            $response = Http::post("{$this->baseUrl}/restart");
            return $response->json();
        } catch (\Exception $e) {
            Log::error('WhatsApp Service Restart Exception: ' . $e->getMessage());
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }
}
