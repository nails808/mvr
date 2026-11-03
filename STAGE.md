# myVicRoads PWA — Reconstruction Log

## Stage 1 — Foundation ✅
Vite + React 19 + TypeScript, PWA plugin, VicColors, UserData/localStorage, bottom nav, Home

## Stage 2 — Profile + Vehicles ✅
Photo upload, unlock/edit, vehicle hero + multi-field edit sheet

## Stage 3 — Digital Licence card ✅
ViewLicenceScreen, hologram, Licence/Identity/Age tabs, 1D Code 128 barcode (licence number, no human-readable text)

## Stage 4 — QR Verification ✅
Firebase RTDB sessions, QR dialog, countdown, scanned polling, success/expired/error

## Stage 5 — Polish ✅
- **Demerit screen** — points gauge, colour levels, remaining points, info card; adjust when Profile editing unlocked
- **Payments screen** — outstanding summary, licence/rego payment cards, illustrative amounts, honest disclaimer
- **Offline** — sticky offline banner; `public/offline.html`; Workbox navigateFallback + image/API caching
- **PWA** — maskable icon entry, lang en-AU, SW register on production build
- **iOS** — viewport-fit, apple-mobile-web-app meta, safe-area on body/nav, black-translucent status bar, no telephone detection, touch-action manipulation

## Run
```bash
cd myvicroads-pwa
npm install
npm run dev      # development
npm run build    # production + service worker
npm run preview  # test installed PWA behaviour
```

## Install on phone
1. Deploy or tunnel the **build** output (HTTPS required for install + camera)
2. Android Chrome → menu → Install app
3. iOS Safari → Share → Add to Home Screen
