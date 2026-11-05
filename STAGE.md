# myVicRoads PWA — Reconstruction Log

**Project:** Progressive Web App reconstruction of the myVicRoads Android application  
**Stack:** Vite + React + TypeScript · vite-plugin-pwa · JsBarcode · qrcode  
**App version shown:** 1.3.7 (Profile → edit entry)

---

## Navigation map

| Destination | Screen | Notes |
|-------------|--------|-------|
| Home tab | `HomeScreen` | Shortcuts + floating My licence bar |
| Vehicles tab | `VehiclesScreen` | Menu → My registered vehicles stack |
| Licence tab | `LicenceScreen` | My licence hero + service list |
| Payments tab | `PaymentsScreen` | Methods / direct debit / history |
| Profile tab | `ProfileScreen` | Settings layout; version opens editor |
| `viewlicence` | `ViewLicenceScreen` | Digital licence (no bottom nav) |
| `demerit` | `DemeritScreen` | Points summary only |
| `myVehicles` | `MyVehiclesScreen` | Vehicle detail (read-only on screen) |

---

## Stage 1 — APK analysis
- Inspected decompiled APK (smali, resources, AndroidManifest, assets).
- Identified tabs, stack destinations, UserData fields, Firebase-style verification session (TTL ~120s).
- Extracted colours, logos (`vlogo_nobg.png`), hologram asset, string resources.

## Stage 2 — PWA foundation
- Vite + React + TypeScript scaffold.
- PWA manifest + service worker (`vite-plugin-pwa`).
- Bottom navigation + stack routing in `App.tsx`.
- `UserData` + `UserRepository` (localStorage).
- Offline banner.

## Stage 3 — Core screens
- Home, Vehicles menu, Licence menu, Payments, Profile shells.
- View licence digital card structure.
- Demerit points screen.
- My registered vehicles detail.

## Stage 4 — Digital licence / QR
- Consent → Reveal QR → in-card QR + countdown.
- Fullscreen QR modal (portal).
- Verification session create/poll helpers.

## Stage 5 — Police barcode
- 1D Code 128 via JsBarcode.
- Encodes licence number only; no human-readable text under bars.
- Full-width, container-measured bar width + ResizeObserver.

## Editing model (current)
- **Removed:** lock icon / unlock-to-edit on View licence & vehicles.
- **Entry:** Profile → **App version 1.3.7** opens full-page `EditDataModal`.
- Modal can update: photo, all licence fields, all vehicle fields, demerit values.
- View licence photo and vehicle rows are **display-only** on those screens.

---

## Screen-by-screen change log

### Home (`HomeScreen`)
- Soft blue-grey gradient background.
- Large greeting: **Hi {firstName}**.
- **Shortcuts** section:
  - Demerit point balance → `demerit` stack.
  - Registered vehicles → `myVehicles` stack.
- Fixed dark **My licence** bar above bottom nav → `viewlicence`.
- Custom SVG icons for demerit gauge and vehicles.

### Licence tab (`LicenceScreen`)
- Large **Licence** title.
- Dark gradient **My licence** hero card → `viewlicence`.
- White list: View demerit points → `demerit`; Manage licence renewal; Order driver history report; Update address; Access myLearners; Replace licence.
- Separate card: **Verify someone’s licence** (QR-style icon).
- Active Licence tab: green icon + pill in bottom nav.

### Payments (`PaymentsScreen`)
- Large **Payments** title.
- Single white card:
  - Manage payment methods (+ subtitle).
  - Direct debit payments (+ subtitle).
  - Transaction history (+ subtitle).
- Soft grey page background; active Payments tab green + pill.

### Profile (`ProfileScreen`)
- Large **Profile** title.
- **Profile and settings:** Personal information, Addresses, Security settings, Passkey settings ›.
- **App controls:** Biometrics and settings › (+ hint), Help and info ›, Provide app feedback ↗.
- **Log out** card.
- Footer control: **App version 1.3.7** → opens `EditDataModal`.
- Active Profile tab: green icon + pill.

### View licence (`ViewLicenceScreen`)
- **View details** header + back; **Last refreshed** timestamp.
- DRIVER LICENCE header + VicRoads logo.
- Photo + hologram overlay (`hologram.png`); tilt/pointer-driven shimmer.
- Consent / QR panel (reveal, countdown, fullscreen modal).
- Segmented tabs: **Licence | Identity | Age** (centred pill control).
- Licence tab: name, grid fields, address, signature, car licence details, status Current/Expired, card number (masked + eye), full-width Victoria Police barcode.
- Identity tab: name, address, signature.
- Age tab: Age status Over 18 / Under 18 with tick/cross.
- Signature: **first + last initials only**, font **Swanky and Moo Moo**.
- No bottom nav on this stack screen.

### Demerit (`DemeritScreen`)
- Points summary, progress bar, remaining text.
- Link rows: offences, good behaviour, how points work.
- **Removed:** “Adjust points (editing unlocked)” section.

### My vehicles (`MyVehiclesScreen`)
- Hero rego / description / status.
- Full vehicle field list (read-only on page; edit via Profile version modal).

### Bottom nav (`BottomNav`)
- Home: VicRoads-style mark; green + pill when active.
- Active states for Home, Licence, Payments, Profile (green + soft pill).
- Vehicles icon; dollar Payments icon; Profile person icon.

### Shared / infrastructure
- `EditDataModal` — full-page editor (photo upload, licence + vehicle fields).
- `HologramOverlay` — device orientation + pointer shine.
- `LicenceBarcode` — dynamic Code 128 full width.
- TypeScript pinned to **5.8.3**.
- Roboto + Swanky and Moo Moo (Google Fonts) in `index.html`.

---

## Key files

| Path | Role |
|------|------|
| `src/App.tsx` | Tab + stack routing; viewlicence/demerit without bottom nav |
| `src/screens/HomeScreen.tsx` | Home layout |
| `src/screens/LicenceScreen.tsx` | Licence tab menu |
| `src/screens/PaymentsScreen.tsx` | Payments list |
| `src/screens/ProfileScreen.tsx` | Profile + version → editor |
| `src/screens/ViewLicenceScreen.tsx` | Digital licence |
| `src/screens/DemeritScreen.tsx` | Demerit points |
| `src/screens/MyVehiclesScreen.tsx` | Vehicle detail |
| `src/components/EditDataModal.tsx` | Full data editor |
| `src/components/HologramOverlay.tsx` | Photo hologram |
| `src/components/LicenceBarcode.tsx` | Police barcode |
| `src/components/BottomNav.tsx` | Tab bar |
| `src/data/UserData.ts` | Data model |
| `src/data/UserRepository.ts` | Persistence |
| `src/data/VerificationRepository.ts` | QR session helpers |

---

## Run

```bash
unzip myvicroads-pwa.zip
cd myvicroads-pwa
npm install
npm run dev
```

Build: `npm run build` (TypeScript 5.8.3 + Vite).
