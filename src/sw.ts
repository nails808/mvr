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
  ({ url }) =>
    /mvr-verify/i.test(url.hostname) ||
    /\/sessions\//i.test(url.pathname),
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

const DEFAULT_TITLE = '';
const DEFAULT_ICON = '/icons/icon-192.png';
const DEFAULT_BADGE = '/icons/icon-192.png';

// --- Web Push ---
// Use payload title / body / icon / badge when provided (no forced "MyVicRoads" title).
self.addEventListener('push', (event: PushEvent) => {
  let title = DEFAULT_TITLE;
  let body = 'You have a new notification';
  let tag = 'mvr-push';
  let icon = DEFAULT_ICON;
  let badge = DEFAULT_BADGE;
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
          icon?: string;
          badge?: string;
          [k: string]: unknown;
        };
        if (typeof parsed.title === 'string' && parsed.title.trim()) {
          title = parsed.title.trim();
        }
        const msg =
          (typeof parsed.body === 'string' && parsed.body.trim()) ||
          (typeof parsed.message === 'string' && parsed.message.trim()) ||
          '';
        if (msg) body = msg;
        if (parsed.tag) tag = String(parsed.tag);
        if (typeof parsed.icon === 'string' && parsed.icon.trim()) {
          icon = parsed.icon.trim();
        }
        if (typeof parsed.badge === 'string' && parsed.badge.trim()) {
          badge = parsed.badge.trim();
        }
        data = parsed;
      } catch {
        if (raw && raw.trim()) body = raw.trim();
      }
    }
  } catch {
    /* keep defaults */
  }

  const options = {
    body,
    tag,
    icon,
    badge,
    data,
    renotify: true,
  } as NotificationOptions;
  event.waitUntil(self.registration.showNotification(title, options));
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
