# Authentication deployment (browser API key — no Node proxy)

## Important
`VITE_APP_API_KEY` is **embedded in client JavaScript**. Anyone can extract it from the browser bundle and call your Worker. Prefer a trusted backend in production if abuse matters.

## Frontend env
Copy `.env.example` → `.env`:

```
VITE_WORKER_URL=https://telegram-user-manager.YOUR_SUBDOMAIN.workers.dev
VITE_APP_API_KEY=same-as-worker-APP_API_KEY
```

## Worker
1. Deploy `worker/src/index.js`
2. Bind D1 as `DB`
3. Secrets: `BOT_TOKEN`, `BOT_SECRET`, `ADMIN_IDS`, `APP_API_KEY`
4. Run `worker/schema.sql` on D1
5. Set Telegram webhook to `https://…/telegram` with `secret_token=BOT_SECRET`

Worker includes **CORS** for browser calls (`X-App-Api-Key` allowed).

## Session storage
Session token is kept in **sessionStorage** (not HttpOnly cookie). Closing the tab ends the local session; `/kick` still invalidates server-side within the 60s validate poll.

## Run app
```
npm install
npm run dev
```

No `server/` proxy is used.
