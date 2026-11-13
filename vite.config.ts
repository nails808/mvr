import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'favicon.svg',
        'offline.html',
      ],
      manifest: {
        id: '/',
        name: 'myVicRoads',
        short_name: 'myVicRoads',
        description: 'Digital Victorian driver licence and vehicle registration',
        theme_color: '#0D2D6B',
        background_color: '#E8ECEE',
        // Prefer standalone app chrome (no browser UI). fullscreen first in override
        // for platforms that support true immersive mode.
        display: 'standalone',
        display_override: ['fullscreen', 'standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait',
        start_url: '/?source=pwa',
        scope: '/',
        lang: 'en-AU',
        dir: 'ltr',
        categories: ['utilities', 'lifestyle'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/mvr-verify.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'verification-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 20, maxAgeSeconds: 120 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
