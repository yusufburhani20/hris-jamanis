import { useEffect, useRef } from 'react';
import axios from 'axios';

/**
 * Convert a base64url string to a Uint8Array — needed to pass VAPID public key
 * to the browser's PushManager.subscribe() call.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * usePushNotification
 *
 * Automatically requests notification permission and subscribes the user to
 * Web Push notifications when mounted inside an authenticated layout.
 *
 * No UI is rendered — this is a side-effect-only hook.
 */
export function usePushNotification() {
    const subscribed = useRef(false);

    useEffect(() => {
        if (subscribed.current) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        // Only run once
        subscribed.current = true;

        const subscribe = async () => {
            try {
                // 1. Ask for notification permission
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return;

                // 2. Wait for service worker to be ready
                const registration = await navigator.serviceWorker.ready;

                // 3. Get VAPID public key from backend
                const { data } = await axios.get('/push/vapid-public-key');
                const vapidPublicKey: string = data.publicKey;
                if (!vapidPublicKey) return;

                // 4. Subscribe to push manager
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
                });

                // 5. Extract keys from subscription
                const subscriptionJson = subscription.toJSON();
                const p256dh = subscriptionJson.keys?.p256dh;
                const auth   = subscriptionJson.keys?.auth;

                // 6. Send subscription to Laravel backend
                await axios.post('/push/subscribe', {
                    endpoint:        subscription.endpoint,
                    publicKey:       p256dh,
                    authToken:       auth,
                    contentEncoding: (PushManager.supportedContentEncodings ?? ['aesgcm'])[0],
                });

                console.log('[PWA] Push notification subscription saved.');
            } catch (err) {
                // Silently fail — push notifications are non-critical
                console.warn('[PWA] Push notification setup failed:', err);
            }
        };

        // Small delay to not block initial page render
        const timer = setTimeout(subscribe, 2000);
        return () => clearTimeout(timer);
    }, []);
}
