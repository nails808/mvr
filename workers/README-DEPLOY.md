# myVicRoads Auth Worker — Deploy Guide

This package contains:

| Path | Purpose |
|------|---------|
| `worker/` | Full Worker source (`src/`, `schema.sql`, `wrangler.toml`) |
| `workers.js` | Single-file bundle for Cloudflare Dashboard paste |

---

## 1. Prerequisites

- Cloudflare account
- [Node.js 18+](https://nodejs.org/) (for Wrangler CLI)
- Telegram bot token from [@BotFather](https://t.me/BotFather)

Install Wrangler globally (once):

```bash
npm install -g wrangler
wrangler login
```

---

## 2. Create D1 database (first time only)

```bash
cd worker
wrangler d1 create telegram-user-manager
```

Copy the printed `database_id`. Edit `wrangler.toml`:

```toml
name = "telegram-user-manager"
main = "src/index.js"
compatibility_date = "2024-11-01"

[[d1_databases]]
binding = "DB"
database_name = "telegram-user-manager"
database_id = "PASTE-YOUR-D1-ID-HERE"
```

---

## 3. Apply database schema

**Option A — Wrangler (recommended)**

```bash
cd worker
wrangler d1 execute telegram-user-manager --remote --file=./schema.sql
```

**Option B — Cloudflare Dashboard**

1. Workers & Pages → **D1** → open `telegram-user-manager`
2. **Console** / **Query** tab
3. Paste and run the contents of `schema.sql`

### Schema overview

Tables: `users`, `sessions`, `login_history`, `settings`

If the DB already existed from an older version, also run:

```sql
ALTER TABLE users ADD COLUMN expires_at TEXT;
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

(Ignore errors if columns/tables already exist.)

---

## 4. Set secrets

```bash
cd worker
wrangler secret put APP_API_KEY
wrangler secret put BOT_TOKEN
wrangler secret put BOT_SECRET
wrangler secret put ADMIN_IDS
```

| Secret | Description |
|--------|-------------|
| `APP_API_KEY` | Shared with frontend `VITE_APP_API_KEY` |
| `BOT_TOKEN` | From BotFather |
| `BOT_SECRET` | Random string for Telegram webhook header |
| `ADMIN_IDS` | Your Telegram numeric user id(s), comma-separated |

Optional:

```bash
wrangler secret put FEEDBACK_CHAT_ID   # group/channel for app feedback
# or ADMIN_CHAT_ID
```

**Dashboard alternative:** Worker → Settings → Variables and Secrets → Add.

---

## 5. Deploy the Worker

### Option A — Wrangler (from source)

```bash
cd worker
wrangler deploy
```

### Option B — Dashboard paste (bundle)

1. Cloudflare → **Workers & Pages** → your worker
2. **Edit code**
3. Replace all code with the contents of **`workers.js`**
4. **Save and deploy**
5. Confirm **D1 binding** name is exactly `DB`

---

## 6. Telegram webhook

After deploy, set the webhook (replace values):

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "content-type: application/json" \
  -d '{
    "url": "https://telegram-user-manager.<your-subdomain>.workers.dev/telegram",
    "secret_token": "<BOT_SECRET>"
  }'
```

Test: message the bot with `/whoami` — should show your Telegram id and Admin: YES.

---

## 7. Frontend env

In the PWA `.env` (or Cloudflare Pages env vars):

```env
VITE_WORKER_URL=https://telegram-user-manager.<your-subdomain>.workers.dev
VITE_APP_API_KEY=<same as APP_API_KEY>
```

Rebuild the PWA after changing these (`npm run build`).

---

## 8. Health check

Open in a browser:

```text
https://telegram-user-manager.<your-subdomain>.workers.dev/
```

Expect JSON like:

```json
{
  "ok": true,
  "service": "telegram-user-manager",
  "db": true,
  "hasBotToken": true,
  "hasAppKey": true,
  "adminCount": 1
}
```

---

## 9. API routes (reference)

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Public health |
| POST | `/auth/login` | `X-App-Api-Key` |
| POST | `/auth/validate` | `X-App-Api-Key` |
| POST | `/auth/logout` | `X-App-Api-Key` |
| GET/POST | `/auth/motd` | `X-App-Api-Key` |
| POST | `/auth/feedback` | `X-App-Api-Key` → Telegram admins |
| POST | `/telegram` | Telegram webhook secret |

---

## 10. Useful Telegram admin commands

`/trial` `/motd` `/refresh` `/disable` `/enable` `/online` `/stats` `/extend` `/purge` `/whoami`

(Requires your user id in `ADMIN_IDS`.)
