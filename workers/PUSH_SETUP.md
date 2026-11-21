# Web Push setup (myVicRoads)

## 1. Generate VAPID keys (once)

```bash
npx web-push generate-vapid-keys --json
```

You need:

- **Public key** — base64url (applicationServerKey)
- **Private key** — full EC **JWK JSON** for the Worker (must include `kty`, `crv`, `d`, `x`, `y`)

Example private JWK shape:

```json
{"kty":"EC","crv":"P-256","d":"...","x":"...","y":"..."}
```

Store the private JWK as a single-line JSON string in the Worker secret.

## 2. Worker secrets

```bash
cd workers/worker
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY   # paste full JWK JSON
wrangler secret put VAPID_SUBJECT       # e.g. mailto:you@example.com
```

(Existing secrets `APP_API_KEY`, `BOT_TOKEN`, `BOT_SECRET`, `ADMIN_IDS` unchanged.)

## 3. Deploy Worker

```bash
cd workers/worker
wrangler deploy
```

Schema auto-migrates on first request (`push_subscriptions`).

## 4. Frontend env

```env
VITE_WORKER_URL=https://telegram-user-manager.<subdomain>.workers.dev
VITE_APP_API_KEY=<same as APP_API_KEY>
VITE_VAPID_PUBLIC_KEY=<same as VAPID_PUBLIC_KEY>
```

Rebuild:

```bash
npm run build
```

## 5. Telegram commands (admin)

| Command | Action |
|---------|--------|
| `/push <email> <message>` | Push to one user |
| `/shout <message>` | Push to all subscribed users |

## 6. Automatic pushes

- **Simultaneous login** — old device receives: *logged out because account signed in elsewhere*
- **Inactivity** — when session expires on validate: *logged out due to inactivity*

## 7. Client behaviour

After login (and while authenticated):

1. Requests **notification** permission → registers Push subscription → `POST /auth/push/subscribe`

User must:

- Install / open the PWA over **HTTPS**
- Allow notifications when prompted

## 8. Health check

`GET /` should include `"hasVapid": true`.

## 9. iOS notes

- iOS 16.4+ supports Web Push **only** for Home Screen PWAs
- User must **Add to Home Screen**, then open from icon
- Notification permission is requested from the standalone context

## 10. Troubleshooting

- `/push` says no subscription → user has not allowed notifications or SW not active
- Push fails with crypto error → `VAPID_PRIVATE_KEY` must be full JWK, not raw `d` only
