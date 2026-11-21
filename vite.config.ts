import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Use injectManifest so src/sw.ts (with Web Push handlers) is the real SW
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
