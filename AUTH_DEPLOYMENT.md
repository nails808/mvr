
## Frontend env
Copy `.env.example` → `.env`:

```
VITE_WORKER_URL=https://telegram-user-manager.YOUR_SUBDOMAIN.workers.dev
VITE_APP_API_KEY=same-as-worker-APP_API_KEY
```

## Worker secrets & bindings

| Name | Type | Purpose |
|------|------|---------|
| `DB` | D1 binding | **Must** be named exactly `DB` |
| `APP_API_KEY` | Secret | Must match frontend `VITE_APP_API_KEY` |
| `BOT_TOKEN` | Secret | From @BotFather |
| `BOT_SECRET` | Secret | Random string; must match webhook `secret_token` |
| `ADMIN_IDS` | Secret | Comma-separated Telegram user ids (numbers) |

## Deploy Worker
1. Paste `worker/src/index.js` into the Worker (or `npx wrangler deploy` from `worker/`).
2. Bind D1 as **`DB`**.
3. Set secrets above.
4. Schema auto-creates on first request (`ensureSchema`). Optional: run `worker/schema.sql` in D1 console.

## Set Telegram webhook

```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<your-worker>.workers.dev/telegram" \
  -d "secret_token=<BOT_SECRET>" \
  -d "allowed_updates=[\"message\",\"edited_message\"]"
```

Check: `curl -s "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"`

## Debug when commands fail

1. **Health** — `GET https://<worker>/`  
   Expect `db: true`, `hasBotToken: true`, `hasBotSecret: true`, `adminCount >= 1`.

2. **Send `/whoami` in Telegram**  
   Shows your numeric Telegram id. If Admin is NO, put that id in `ADMIN_IDS` and save.  
   `/whoami` works even when not admin.

3. **Webhook secret** — `secret_token` in setWebhook must exactly match Worker `BOT_SECRET`.

4. **Only “Unauthorized”** — wrong ADMIN_IDS; use `/whoami`.

5. **No reply at all** — wrong webhook URL/path (`/telegram`), bad BOT_TOKEN, or Worker not deployed.

6. **DB error in reply** — D1 binding not named `DB`.

## Sessions
- Token in sessionStorage; 15-minute idle; one session per user.
