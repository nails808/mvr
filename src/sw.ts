/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching
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

const APP_TITLE = 'MyVicRoads';
const APP_ICON = '/icons/icon-192.png';
const APP_BADGE = '/icons/icon-192.png';

// --- Web Push ---
// Title is always "MyVicRoads". Body is the actual push message from the Worker.
self.addEventListener('push', (event: PushEvent) => {
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
          message?: string;
          tag?: string;
          [k: string]: unknown;
        };
        // Prefer body, then message, then raw string
        const msg =
          (typeof parsed.body === 'string' && parsed.body.trim()) ||
          (typeof parsed.message === 'string' && parsed.message.trim()) ||
          '';
        if (msg) body = msg;
        if (parsed.tag) tag = String(parsed.tag);
        data = parsed;
      } catch {
        // Non-JSON payload — treat entire text as the message body
        if (raw && raw.trim()) body = raw.trim();
      }
    }
  } catch {
    /* keep defaults */
  }

  event.waitUntil(
    self.registration.showNotification(APP_TITLE, {
      body,
      tag,
      icon: APP_ICON,
      badge: APP_BADGE,
      data,
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
