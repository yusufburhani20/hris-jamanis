<?php

namespace App\Services;

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class WebPushService
{
    private WebPush $webPush;

    public function __construct()
    {
        // On Windows local development environments, OpenSSL key signing/generation
        // requires the OPENSSL_CONF environment variable to point to a valid openssl.cnf file.
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' && !getenv('OPENSSL_CONF')) {
            $phpDir = dirname(PHP_BINARY);
            $possiblePaths = [
                $phpDir . '\extras\ssl\openssl.cnf',
                'C:\laragon\bin\php\\' . basename($phpDir) . '\extras\ssl\openssl.cnf',
                'C:\laragon\bin\php\php-8.4.21-nts-Win32-vs17-x64\extras\ssl\openssl.cnf',
            ];
            foreach ($possiblePaths as $path) {
                if (file_exists($path)) {
                    putenv("OPENSSL_CONF=$path");
                    break;
                }
            }
        }

        $this->webPush = new WebPush([
            'VAPID' => [
                'subject'    => config('app.url'),
                'publicKey'  => config('services.vapid.public_key', ''),
                'privateKey' => config('services.vapid.private_key', ''),
            ],
        ]);
        $this->webPush->setReuseVAPIDHeaders(true);
    }

    /**
     * Send push notification to a specific user.
     */
    public function sendToUser(int $userId, string $title, string $body, array $data = []): void
    {
        $subscriptions = PushSubscription::where('user_id', $userId)->get();
        $this->dispatch($subscriptions, $title, $body, $data);
    }

    /**
     * Send push notification to all admins.
     */
    public function sendToAdmins(string $title, string $body, array $data = []): void
    {
        $adminIds = User::where('role', 'LIKE', '%admin%')->pluck('id');
        $subscriptions = PushSubscription::whereIn('user_id', $adminIds)->get();
        $this->dispatch($subscriptions, $title, $body, $data);
    }

    /**
     * Send push notification to all subscribers.
     */
    public function sendToAll(string $title, string $body, array $data = []): void
    {
        $subscriptions = PushSubscription::all();
        $this->dispatch($subscriptions, $title, $body, $data);
    }

    /**
     * Send to a collection of subscriptions.
     */
    public function dispatch($subscriptions, string $title, string $body, array $data = []): void
    {
        if ($subscriptions->isEmpty()) {
            return;
        }

        $payload = json_encode([
            'title' => $title,
            'body'  => $body,
            'icon'  => '/images/icon-192.png',
            'badge' => '/images/badge.png',
            'data'  => array_merge(['url' => '/dashboard'], $data),
        ]);

        foreach ($subscriptions as $sub) {
            $subscription = Subscription::create([
                'endpoint'        => $sub->endpoint,
                'publicKey'       => $sub->public_key,
                'authToken'       => $sub->auth_token,
                'contentEncoding' => $sub->content_encoding ?? 'aesgcm',
            ]);

            $this->webPush->queueNotification($subscription, $payload);
        }

        foreach ($this->webPush->flush() as $report) {
            if ($report->isSubscriptionExpired()) {
                // Remove stale subscription
                PushSubscription::where('endpoint', $report->getRequest()->getUri()->__toString())->delete();
                Log::info('Deleted expired push subscription: ' . $report->getRequest()->getUri());
            } elseif (!$report->isSuccess()) {
                Log::warning('Push notification failed: ' . $report->getReason());
            }
        }
    }
}
