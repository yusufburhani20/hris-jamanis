const CACHE_NAME = 'hris-pwa-cache-v14';
const ASSETS_TO_CACHE = [
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/favicon.ico',
    '/manifest.json',
    '/login'
];

// Helper to fetch and cache a URL cleanly, handling potential redirects
async function cleanAndCacheUrl(cache, url) {
    try {
        const response = await fetch(url);
        if (response && response.status === 200) {
            // Re-create the response to clean the 'redirected' flag and avoid Cache API TypeErrors
            const body = await response.blob();
            const cleanResponse = new Response(body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
            await cache.put(url, cleanResponse);
            
            // Also seed the other main entry path shells immediately to guarantee offline loads
            if (url === '/login') {
                await cache.put('/', cleanResponse.clone());
                await cache.put('/dashboard', cleanResponse.clone());
            }
        }
    } catch (err) {
        console.warn(`Failed to cleanly cache redirected url ${url}:`, err);
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            const cachePromises = ASSETS_TO_CACHE.map((url) => {
                if (url === '/login') {
                    return cleanAndCacheUrl(cache, url);
                }
                return cache.add(url).catch((err) => {
                    console.warn(`Failed to pre-cache ${url}:`, err);
                });
            });
            return Promise.all(cachePromises);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Helper to escape HTML characters in JSON string
function escapeHtml(string) {
    return string
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Helper to search cache keys for any HTML response
async function getCachedHtmlShell(cache) {
    const fallbacks = ['/login', '/dashboard', '/'];
    
    // 1. Try matching fallbacks with ignoreVary: true
    for (const url of fallbacks) {
        const cached = await cache.match(url, { ignoreVary: true });
        if (cached) {
            const contentType = cached.headers.get('Content-Type');
            if (contentType && contentType.includes('text/html')) {
                return cached;
            }
        }
    }
    
    // 2. Scan keys for HTML responses matching the fallbacks
    const keys = await cache.keys();
    for (const request of keys) {
        const url = new URL(request.url);
        if (fallbacks.includes(url.pathname)) {
            const cached = await cache.match(request);
            if (cached) {
                const contentType = cached.headers.get('Content-Type');
                if (contentType && contentType.includes('text/html')) {
                    return cached;
                }
            }
        }
    }
    
    // 3. Fallback to any HTML response in the cache
    for (const request of keys) {
        const cached = await cache.match(request);
        if (cached) {
            const contentType = cached.headers.get('Content-Type');
            if (contentType && contentType.includes('text/html')) {
                return cached;
            }
        }
    }
    return null;
}

// Helper to construct offline HTML page by merging cached HTML shell and Inertia JSON
async function getOfflineHtmlResponse(request, cache) {
    // 1. Try to find the cached Inertia JSON for this URL
    let inertiaRequest = new Request(request.url, {
        headers: { 'x-inertia': 'true' }
    });
    let inertiaResponse = await cache.match(inertiaRequest, { ignoreSearch: true });

    // If not found, and it's root or dashboard, try matching /dashboard JSON
    if (!inertiaResponse) {
        const url = new URL(request.url);
        if (url.pathname === '/' || url.pathname.includes('utm_source=pwa') || url.pathname === '/dashboard') {
            const dashboardRequest = new Request('/dashboard', {
                headers: { 'x-inertia': 'true' }
            });
            inertiaResponse = await cache.match(dashboardRequest);
        }
    }

    // 2. Fetch the cached HTML shell
    const shellResponse = await getCachedHtmlShell(cache);
    if (!shellResponse) {
        return null;
    }

    if (!inertiaResponse) {
        // Fallback to just the HTML shell directly
        return shellResponse;
    }

    try {
        const shellHtmlText = await shellResponse.text();
        const inertiaJsonText = await inertiaResponse.text();

        // Update the URL in the Inertia page data to represent the actual requested path
        const inertiaData = JSON.parse(inertiaJsonText);
        inertiaData.url = new URL(request.url).pathname;

        const escapedJson = escapeHtml(JSON.stringify(inertiaData));
        const modifiedHtml = shellHtmlText.replace(/data-page="[^"]*"/, `data-page="${escapedJson}"`);

        return new Response(modifiedHtml, {
            headers: { 'Content-Type': 'text/html' }
        });
    } catch (e) {
        console.error('Error merging offline HTML:', e);
        return shellResponse;
    }
}

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    
    // Ignore internal Laravel dev tools, Inertia reload, hot updates, API routes, or admin calculations
    if (
        url.pathname.startsWith('/_') || 
        url.pathname.startsWith('/api') || 
        url.pathname.startsWith('/sanctum') || 
        url.pathname.startsWith('/telescope') ||
        url.pathname.includes('/admin/payrolls/') ||
        (url.pathname.includes('/attendances/') && !url.pathname.includes('/scanner') && !url.pathname.includes('/history'))
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (!response || response.status !== 200) {
                    return response;
                }

                const isInertia = event.request.headers.get('x-inertia') === 'true';

                // Cache navigation HTML documents dynamically under their request URL
                if (event.request.mode === 'navigate') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                        // Also update the general '/' fallback cache
                        if (url.pathname === '/' || url.pathname === '/dashboard') {
                            cache.put('/', responseToCache.clone());
                        }
                    });
                }

                // Cache static assets (CSS, JS, images, fonts) and Inertia JSON responses
                const isStaticAsset = (
                    event.request.destination === 'style' ||
                    event.request.destination === 'script' ||
                    event.request.destination === 'image' ||
                    event.request.destination === 'font'
                );

                if (isStaticAsset || isInertia) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return response;
            })
            .catch(() => {
                const isInertia = event.request.headers.get('x-inertia') === 'true';

                // For Inertia JSON requests, match strictly (checking Vary) so we get the JSON response.
                // For navigate requests, match with ignoreVary: true to bypass Cookie/User-Agent mismatches.
                const matchOptions = {
                    ignoreSearch: true,
                    ignoreVary: !isInertia
                };

                // Fallback to cache if request fails (e.g. offline)
                return caches.match(event.request, matchOptions).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    if (isInertia) {
                        // Redirect to /dashboard if the Inertia JSON is not cached
                        return new Response('', {
                            status: 409,
                            headers: {
                                'x-inertia-location': '/dashboard'
                            }
                        });
                    }

                    if (event.request.mode === 'navigate') {
                        return caches.open(CACHE_NAME).then((cache) => {
                            return getOfflineHtmlResponse(event.request, cache).then((offlineResponse) => {
                                if (offlineResponse) {
                                    return offlineResponse;
                                }
                                return caches.match('/');
                            });
                        });
                    }
                });
            })
    );
});

// ─── PUSH NOTIFICATION HANDLER ───────────────────────────────────────────────

self.addEventListener('push', (event) => {
    let data = {
        title: 'HRIS Enterprise',
        body: 'Ada notifikasi baru untuk Anda.',
        icon: '/images/icon-192.png',
        badge: '/images/badge.png',
        data: { url: '/' }
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            data = {
                title: parsed.title || data.title,
                body: parsed.body || data.body,
                icon: parsed.icon || data.icon,
                badge: parsed.badge || data.badge,
                data: parsed.data || data.data,
            };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            data: data.data,
            vibrate: [200, 100, 200],
            requireInteraction: false,
            tag: data.data?.url || 'hris-notification',
        })
    );
});

// ─── NOTIFICATION CLICK HANDLER ──────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        client.navigate(targetUrl);
                    }
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
