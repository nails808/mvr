/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching (mirror previous generateSW config)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 8,
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 86400 })],
  })
);

registerRoute(
  ({ url }) => /^https:\/\/mvr-verify/i.test(url.href),
  new NetworkFirst({
    cacheName: 'verification-api',
    networkTimeoutSeconds: 8,
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 120 })],
  })
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// --- Web Push ---
self.addEventListener('push', (event: PushEvent) => {
  let title = 'myVicRoads';
  let body = 'You have a new notification';
  let tag = 'mvr-push';
  let data: Record<string, unknown> = {};

  try {
    if (event.data) {
      const raw = event.data.text();
      try {
        const parsed = JSON.parse(raw) as {
          title?: string;
          body?: string;
          tag?: string;
          [k: string]: unknown;
        };
        if (parsed.title) title = String(parsed.title);
        if (parsed.body) body = String(parsed.body);
        if (parsed.tag) tag = String(parsed.tag);
        data = parsed;
      } catch {
        body = raw || body;
      }
    }
  } catch {
    /* use defaults */
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data,
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
