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
        $this->webPush = new WebPush([
            'VAPID' => [
                'subject'    => config('app.url'),
                'publicKey'  => env('VAPID_PUBLIC_KEY', ''),
                'privateKey' => env('VAPID_PRIVATE_KEY', ''),
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
    private function dispatch($subscriptions, string $title, string $body, array $data = []): void
    {
        if ($subscriptions->isEmpty()) {
            return;
        }

        $payload = json_encode([
            'title' => $title,
            'body'  => $body,
            'icon'  => '/images/icon-192.png',
            'badge' => '/images/icon-192.png',
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
