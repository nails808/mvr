# mvr-verify-api — Cloudflare setup (replaces Firebase)

## What you get

| Resource | Purpose |
|----------|---------|
| Worker `mvr-verify-api` | Session PUT/GET, scannedAt, serves `/verify.html` |
| D1 `mvr-verify` | Session metadata |
| R2 `mvr-verify-photos` | Licence JPEG bytes (optional binding — photos stored here) |
| Cron hourly | Deletes expired sessions + R2 objects |

QR content remains a **URL** to `verify.html?id={sessionId}` (or fallback `?data=`). Encoder settings in the PWA are unchanged.

## Prerequisites

- Cloudflare account
- Node 20+
- Wrangler: `npm i -g wrangler` then `wrangler login`

## 1. Create D1 database

```bash
cd workers/verify-api
npm install
wrangler d1 create mvr-verify
```

Copy the printed `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mvr-verify"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Migrate schema (remote):

```bash
wrangler d1 execute mvr-verify --remote --file=./schema.sql
```

Local optional:

```bash
wrangler d1 execute mvr-verify --local --file=./schema.sql
```

## 2. Create R2 bucket

```bash
wrangler r2 bucket create mvr-verify-photos
```

`wrangler.toml` already binds:

```toml
[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "mvr-verify-photos"
```

## 3. Optional write protection

By default PUTs are open (Firebase parity). To require a key:

```bash
wrangler secret put VERIFY_WRITE_KEY
# enter a long random string
```

Then set the same value in the PWA `.env`:

```env
VITE_VERIFY_WRITE_KEY=<same-string>
```

## 4. Deploy Worker

```bash
cd workers/verify-api
wrangler deploy
```

Note the URL, e.g. `https://mvr-verify-api.<account>.workers.dev`.

Health check:

```bash
curl https://mvr-verify-api.<account>.workers.dev/
# {"ok":true,"service":"mvr-verify-api","hasDb":true,"hasR2":true,...}
```

Verify page:

```bash
curl -I https://mvr-verify-api.<account>.workers.dev/verify.html
```

## 5. Custom domain (optional)

Cloudflare Dashboard → Workers → `mvr-verify-api` → Settings → Triggers → **Add Custom Domain**  
e.g. `verify.yourdomain.com`

Then:

```env
VITE_VERIFY_API_URL=https://verify.yourdomain.com
VITE_VERIFY_PAGE_URL=https://verify.yourdomain.com/verify.html
```

## 6. Point the PWA at the Worker

Root `.env`:

```env
VITE_VERIFY_API_URL=https://mvr-verify-api.<account>.workers.dev
VITE_VERIFY_PAGE_URL=https://mvr-verify-api.<account>.workers.dev/verify.html
```

Rebuild frontend:

```bash
cd ../..   # repo root
npm install
npm run build
# deploy dist/ (Pages, etc.)
```

## 7. API contract (for debugging)

**Create session (PWA):**

```http
PUT /sessions/{20-char-id}
Content-Type: application/json
X-Verify-Write-Key: <optional>

{
  "name": "FIRST LAST",
  "address": "...",
  "licenceNumber": "...",
  "licenceStatus": "...",
  "proficiency": "...",
  "licenceExpiry": "...",
  "dob": "...",
  "licenceType": "...",
  "createdAt": 1730000000000,
  "expiresAt": 1730000120000,
  "photoBase64": "<jpeg base64 no data-url prefix or null>",
  "scannedAt": null
}
```

**Read session (verify page):**

```http
GET /sessions/{id}
→ session JSON or null if missing/expired
```

**Mark scanned:**

```http
PUT /sessions/{id}/scannedAt
Body: 1730000050000
```

**Poll scanned (PWA):**

```http
GET /sessions/{id}/scannedAt
→ timestamp text or "null"
```

`.json` suffixes are accepted and stripped.

## 8. End-to-end test

1. Build PWA with env vars set; open over HTTPS / installed PWA.
2. View licence → reveal QR.
3. Network: `PUT .../sessions/...` → 200.
4. Scan QR (second device) → verify page shows name/photo.
5. App countdown switches to “Licence Verified!” within ~3s.
6. After 2 minutes, new scan shows expired.

## 9. Local Worker dev

```bash
cd workers/verify-api
wrangler d1 execute mvr-verify --local --file=./schema.sql
wrangler dev
```

Use the printed `http://127.0.0.1:8787` as `VITE_VERIFY_API_URL` for local PWA testing.

## 10. Purge / ops

- Cron runs hourly: deletes rows with `expires_at < now` and matching R2 keys.
- Manual SQL: Dashboard → D1 → `mvr-verify` → console.

## Files

```
workers/verify-api/
  wrangler.toml
  schema.sql
  package.json
  public/verify.html
  src/index.js
workers/VERIFY_SETUP.md   ← this file
```
