// worker/src/lib/constants.js
var SESSION_IDLE_MS = 15 * 60 * 1e3;
var TRIAL_TTL_MS = 24 * 60 * 60 * 1e3;
var MAX_LOGIN_ATTEMPTS = 8;
var LOGIN_WINDOW_MS = 15 * 60 * 1e3;
var MOTD_KEY = "motd";
var FORCE_REFRESH_KEY = "force_refresh_at";
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function expiresIso(fromMs = Date.now()) {
  return new Date(fromMs + SESSION_IDLE_MS).toISOString();
}
function trialExpiresIso(fromMs = Date.now()) {
  return new Date(fromMs + TRIAL_TTL_MS).toISOString();
}
function normUsername(u) {
  return String(u || "").trim().toLowerCase();
}
function adminIds(env) {
  return String(env.ADMIN_IDS || "").split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}
function isAdmin(env, telegramUserId) {
  if (telegramUserId == null) return false;
  const id = String(telegramUserId).trim();
  return adminIds(env).some((a) => a === id);
}

// worker/src/lib/crypto.js
var PBKDF2_ITERATIONS = 5e4;
function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomBytes(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}
function randomAlnum(n) {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += chars[bytes[i] % chars.length];
  return out;
}
function randomPassword(n = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += chars[bytes[i] % chars.length];
  return out;
}
async function sha256Hex(text) {
  const dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bufToHex(dig);
}
async function pbkdf2Hash(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return bufToHex(bits);
}
async function hashPassword(password) {
  const salt = bufToHex(randomBytes(16));
  const hash = await pbkdf2Hash(password, salt);
  return { salt, hash };
}
async function verifyPassword(password, salt, expectedHash) {
  return await pbkdf2Hash(password, salt) === expectedHash;
}

// worker/src/lib/db.js
async function ensureSchema(env) {
  if (!env.DB) throw new Error("D1 binding DB is missing");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_logged_in TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at TEXT
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_activity TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      logged_in_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(logged_in_at DESC)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_users_expires ON users(expires_at)`)
  ]);
  try {
    await env.DB.prepare(`ALTER TABLE users ADD COLUMN expires_at TEXT`).run();
  } catch {
  }
}
async function getSetting(env, key) {
  try {
    const row = await env.DB.prepare(`SELECT value FROM settings WHERE key = ?`).bind(key).first();
    return row?.value ?? "";
  } catch {
    return "";
  }
}
async function setSetting(env, key, value) {
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(key, value, now).run();
}
async function purgeExpiredUser(env, userId) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId),
    env.DB.prepare(`UPDATE users SET status = 'disabled' WHERE id = ?`).bind(userId)
  ]);
}
function isAccountExpired(user) {
  if (!user || !user.expires_at) return false;
  return new Date(user.expires_at).getTime() <= Date.now();
}

// worker/src/lib/http.js
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}
function unauthorized(msg = "Unauthorized") {
  return json({ ok: false, error: msg }, 401);
}
function badRequest(msg) {
  return json({ ok: false, error: msg }, 400);
}
function withCors(request, response) {
  const origin = request.headers.get("Origin") || "*";
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "content-type, x-app-api-key");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
function requireAppKey(request, env) {
  const key = request.headers.get("X-App-Api-Key") || "";
  return Boolean(key && env.APP_API_KEY && key === env.APP_API_KEY);
}

// worker/src/lib/rateLimit.js
var loginAttempts = /* @__PURE__ */ new Map();
function rateLimitOk(ip) {
  const now = Date.now();
  const row = loginAttempts.get(ip);
  if (!row || now > row.reset) {
    loginAttempts.set(ip, { count: 1, reset: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (row.count >= MAX_LOGIN_ATTEMPTS) return false;
  row.count += 1;
  return true;
}

// worker/src/lib/commands.js
async function cmdAdd(env, args) {
  const [username, password] = args;
  if (!username || !password) return "Usage: /add username password";
  const u = normUsername(username);
  if (u.length < 2) return "Username too short.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  const { salt, hash } = await hashPassword(password);
  try {
    await env.DB.prepare(
      `INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)`
    ).bind(u, hash, salt).run();
  } catch {
    return `User <b>${u}</b> already exists.`;
  }
  return `Created user <b>${u}</b>.`;
}
async function cmdTrial(env) {
  const username = `trial_${randomAlnum(8)}@trial.local`;
  const password = randomPassword(10);
  const { salt, hash } = await hashPassword(password);
  const expires = trialExpiresIso();
  try {
    await env.DB.prepare(
      `INSERT INTO users (username, password_hash, password_salt, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(username, hash, salt, expires).run();
  } catch (e) {
    return `Failed to create trial: ${e instanceof Error ? e.message : "error"}`;
  }
  return `<b>Trial account created</b> (expires in 24h)

Username: <code>${username}</code>
Password: <code>${password}</code>
Expires: ${expires}`;
}
async function cmdMotd(env, args) {
  if (!args.length) {
    const current = await getSetting(env, MOTD_KEY);
    if (!current) return "MOTD is empty.\nUsage: /motd your message here\nClear: /motd clear";
    return `<b>Current MOTD</b>
${current}`;
  }
  if (args.length === 1 && args[0].toLowerCase() === "clear") {
    await setSetting(env, MOTD_KEY, "");
    return "MOTD cleared.";
  }
  const message = args.join(" ").trim();
  if (!message) return "Usage: /motd your message here";
  if (message.length > 2e3) return "MOTD too long (max 2000 characters).";
  await setSetting(env, MOTD_KEY, message);
  return `<b>MOTD updated</b>
${message}`;
}
async function cmdDel(env, args) {
  const u = normUsername(args[0]);
  if (!u) return "Usage: /del username";
  const user = await env.DB.prepare(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`).bind(u).first();
  if (!user) return `User <b>${u}</b> not found.`;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id),
    env.DB.prepare(`DELETE FROM login_history WHERE user_id = ?`).bind(user.id),
    env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(user.id)
  ]);
  return `Deleted user <b>${u}</b> and terminated sessions.`;
}
async function cmdEdit(env, args) {
  const [username, password] = args;
  if (!username || !password) return "Usage: /edit username password";
  const u = normUsername(username);
  if (password.length < 6) return "Password must be at least 6 characters.";
  const user = await env.DB.prepare(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`).bind(u).first();
  if (!user) return `User <b>${u}</b> not found.`;
  const { salt, hash } = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?`).bind(
      hash,
      salt,
      user.id
    ),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id)
  ]);
  return `Password updated for <b>${u}</b>. Active sessions terminated.`;
}
async function cmdSearch(env, args) {
  const u = normUsername(args[0]);
  if (!u) return "Usage: /search username";
  const user = await env.DB.prepare(
    `SELECT id, username, created_at, last_logged_in, status, expires_at FROM users WHERE username = ? COLLATE NOCASE`
  ).bind(u).first();
  if (!user) return `User <b>${u}</b> not found.`;
  const sess = await env.DB.prepare(
    `SELECT created_at, last_activity, expires_at FROM sessions WHERE user_id = ?`
  ).bind(user.id).first();
  let sessionLine = "Session: none";
  if (sess) {
    const active = new Date(sess.expires_at).getTime() > Date.now();
    sessionLine = `Session: ${active ? "ACTIVE" : "expired"}
Created: ${sess.created_at}
Last activity: ${sess.last_activity}
Expires: ${sess.expires_at}`;
  }
  let trialLine = "Account expiry: permanent";
  if (user.expires_at) {
    const expired = new Date(user.expires_at).getTime() <= Date.now();
    trialLine = `Account expiry: ${user.expires_at}${expired ? " (EXPIRED)" : ""}`;
  }
  return `<b>${user.username}</b> (id ${user.id})
Status: ${user.status}
Created: ${user.created_at}
Last login: ${user.last_logged_in || "never"}
${trialLine}
${sessionLine}`;
}
async function cmdList(env) {
  const { results } = await env.DB.prepare(
    `SELECT username, status, last_logged_in, expires_at FROM users ORDER BY username COLLATE NOCASE`
  ).all();
  if (!results?.length) return "No users.";
  return results.map((r) => {
    const trial = r.expires_at ? ` trial\u2192${r.expires_at}` : "";
    return `\u2022 <b>${r.username}</b> [${r.status}] last=${r.last_logged_in || "never"}${trial}`;
  }).join("\n");
}
async function cmdCount(env) {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS c FROM users`).first();
  return `Total users: <b>${row?.c ?? 0}</b>`;
}
async function cmdRecent(env) {
  const { results } = await env.DB.prepare(
    `SELECT u.username, h.logged_in_at FROM login_history h JOIN users u ON u.id = h.user_id ORDER BY h.logged_in_at DESC LIMIT 15`
  ).all();
  if (!results?.length) return "No login history.";
  return results.map((r) => `\u2022 <b>${r.username}</b> \u2014 ${r.logged_in_at}`).join("\n");
}
async function cmdKick(env, args) {
  const u = normUsername(args[0]);
  if (!u) return "Usage: /kick username";
  const user = await env.DB.prepare(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`).bind(u).first();
  if (!user) return `User <b>${u}</b> not found.`;
  const res = await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id).run();
  const n = res?.meta?.changes ?? 0;
  return n ? `Kicked <b>${u}</b> \u2014 session terminated.` : `<b>${u}</b> had no active session.`;
}
async function cmdDisable(env, args) {
  const u = normUsername(args[0]);
  if (!u) return "Usage: /disable username";
  const user = await env.DB.prepare(
    `SELECT id, username, status FROM users WHERE username = ? COLLATE NOCASE`
  ).bind(u).first();
  if (!user) return `User <b>${u}</b> not found.`;
  if (user.status === "disabled") return `<b>${user.username}</b> is already disabled.`;
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET status = 'disabled' WHERE id = ?`).bind(user.id),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id)
  ]);
  return `Disabled <b>${user.username}</b> and terminated sessions.`;
}
async function cmdEnable(env, args) {
  const u = normUsername(args[0]);
  if (!u) return "Usage: /enable username";
  const user = await env.DB.prepare(
    `SELECT id, username, status, expires_at FROM users WHERE username = ? COLLATE NOCASE`
  ).bind(u).first();
  if (!user) return `User <b>${u}</b> not found.`;
  if (user.expires_at && new Date(user.expires_at).getTime() <= Date.now()) {
    return `<b>${user.username}</b> has an expired trial (${user.expires_at}). Use /extend ${user.username} &lt;hours&gt; first.`;
  }
  if (user.status === "active") return `<b>${user.username}</b> is already active.`;
  await env.DB.prepare(`UPDATE users SET status = 'active' WHERE id = ?`).bind(user.id).run();
  return `Enabled <b>${user.username}</b>.`;
}
async function cmdOnline(env) {
  const now = nowIso();
  const { results } = await env.DB.prepare(
    `SELECT u.username, s.last_activity, s.expires_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.expires_at > ?
     ORDER BY s.last_activity DESC LIMIT 50`
  ).bind(now).all();
  if (!results?.length) return "No active sessions.";
  return `<b>Online (${results.length})</b>
` + results.map((r) => `\u2022 <b>${r.username}</b>
  last=${r.last_activity}
  session\u2192${r.expires_at}`).join("\n");
}
async function cmdStats(env) {
  const now = nowIso();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString();
  const total = await env.DB.prepare(`SELECT COUNT(*) AS c FROM users`).first();
  const activeUsers = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE status = 'active'`
  ).first();
  const disabled = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE status = 'disabled'`
  ).first();
  const trialsActive = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE expires_at IS NOT NULL AND expires_at > ?`
  ).bind(now).first();
  const trialsExpired = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE expires_at IS NOT NULL AND expires_at <= ?`
  ).bind(now).first();
  const sessions = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?`
  ).bind(now).first();
  const logins24 = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM login_history WHERE logged_in_at > ?`
  ).bind(dayAgo).first();
  const logins7 = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM login_history WHERE logged_in_at > ?`
  ).bind(weekAgo).first();
  return `<b>Stats</b>
Users total: <b>${total?.c ?? 0}</b>
  active: ${activeUsers?.c ?? 0}
  disabled: ${disabled?.c ?? 0}
Trials active: ${trialsActive?.c ?? 0}
Trials expired: ${trialsExpired?.c ?? 0}
Active sessions: <b>${sessions?.c ?? 0}</b>
Logins (24h): ${logins24?.c ?? 0}
Logins (7d): ${logins7?.c ?? 0}`;
}
async function cmdExtend(env, args) {
  const u = normUsername(args[0]);
  const hoursRaw = args[1];
  if (!u || hoursRaw == null) {
    return "Usage: /extend username hours\nExample: /extend trial_abc@trial.local 48";
  }
  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 365) {
    return "Hours must be a positive number (max 8760).";
  }
  const user = await env.DB.prepare(
    `SELECT id, username, status, expires_at FROM users WHERE username = ? COLLATE NOCASE`
  ).bind(u).first();
  if (!user) return `User <b>${u}</b> not found.`;
  const baseMs = user.expires_at && new Date(user.expires_at).getTime() > Date.now() ? new Date(user.expires_at).getTime() : Date.now();
  const newExp = new Date(baseMs + hours * 60 * 60 * 1e3).toISOString();
  await env.DB.prepare(`UPDATE users SET expires_at = ?, status = 'active' WHERE id = ?`).bind(newExp, user.id).run();
  return `Extended <b>${user.username}</b> by ${hours}h.
New expiry: ${newExp}
Status: active`;
}
async function cmdPurgeTrials(env, args) {
  const target = (args[0] || "trials").toLowerCase();
  if (target !== "trials") return "Usage: /purge trials";
  const now = nowIso();
  const { results } = await env.DB.prepare(
    `SELECT id, username, expires_at FROM users WHERE expires_at IS NOT NULL AND expires_at <= ?`
  ).bind(now).all();
  if (!results?.length) return "No expired trial accounts to purge.";
  for (const row of results) {
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET status = 'disabled' WHERE id = ?`).bind(row.id),
      env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(row.id)
    ]);
  }
  const names = results.slice(0, 20).map((r) => `\u2022 ${r.username} (${r.expires_at})`).join("\n");
  const more = results.length > 20 ? `
\u2026and ${results.length - 20} more` : "";
  return `<b>Purged ${results.length} expired trial(s)</b>
Accounts disabled; sessions cleared.
${names}${more}`;
}
async function cmdRefresh(env) {
  const ts = nowIso();
  await setSetting(env, FORCE_REFRESH_KEY, ts);
  return `<b>Force refresh issued</b>
Token: <code>${ts}</code>

Online clients hard-reload within ~1 minute.`;
}
async function cmdWhoami(env, fromId, chatId) {
  const admins = adminIds(env);
  const ok = isAdmin(env, fromId);
  return `<b>Whoami</b>
Your Telegram id: <code>${fromId}</code>
Chat id: <code>${chatId}</code>
Admin: ${ok ? "YES" : "NO"}
Configured ADMIN_IDS: <code>${admins.join(", ") || "(empty)"}</code>

` + (ok ? "You can run admin commands." : "Add your id to Worker secret <b>ADMIN_IDS</b>, then retry.");
}
function helpText() {
  return "<b>Telegram User Manager</b>\n\n/whoami\n/add username password\n/trial\n/extend username hours\n/disable username\n/enable username\n/del username\n/edit username password\n/search username\n/list\n/online\n/stats\n/count\n/recent\n/kick username\n/purge trials\n/motd [message]\n/motd clear\n/refresh\n/help";
}
async function dispatchCommand(env, cmd, args) {
  switch (cmd) {
    case "/add":
      return cmdAdd(env, args);
    case "/trial":
      return cmdTrial(env);
    case "/motd":
      return cmdMotd(env, args);
    case "/del":
      return cmdDel(env, args);
    case "/edit":
      return cmdEdit(env, args);
    case "/search":
      return cmdSearch(env, args);
    case "/list":
      return cmdList(env);
    case "/count":
      return cmdCount(env);
    case "/recent":
      return cmdRecent(env);
    case "/kick":
      return cmdKick(env, args);
    case "/disable":
      return cmdDisable(env, args);
    case "/enable":
      return cmdEnable(env, args);
    case "/online":
      return cmdOnline(env);
    case "/stats":
      return cmdStats(env);
    case "/extend":
      return cmdExtend(env, args);
    case "/purge":
      return cmdPurgeTrials(env, args);
    case "/refresh":
      return cmdRefresh(env);
    case "/help":
    case "/start":
      return helpText();
    default:
      return "Unknown command. /help";
  }
}

// worker/src/lib/telegram.js
async function telegramSend(env, chatId, text) {
  if (!env.BOT_TOKEN) {
    console.log("telegramSend: BOT_TOKEN missing");
    return { ok: false, error: "BOT_TOKEN missing" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: String(text).slice(0, 4e3),
        parse_mode: "HTML"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      console.log("telegramSend failed", res.status, data);
      return { ok: false, error: data.description || String(res.status) };
    }
    return { ok: true };
  } catch (e) {
    console.log("telegramSend exception", e);
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
function extractMessage(update) {
  return update.message || update.edited_message || update.channel_post || update.edited_channel_post || null;
}
async function handleTelegram(request, env) {
  const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || request.headers.get("x-telegram-bot-api-secret-token") || "";
  const expected = String(env.BOT_SECRET || "").trim();
  if (!expected) return unauthorized("BOT_SECRET is not configured on the Worker");
  if (secretHeader.trim() !== expected) return unauthorized("Invalid Telegram secret");
  let update;
  try {
    update = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const msg = extractMessage(update);
  if (!msg?.chat) return json({ ok: true, ignored: "no message" });
  const text = (msg.text || msg.caption || "").trim();
  if (!text) return json({ ok: true, ignored: "no text" });
  const fromId = msg.from?.id;
  const chatId = msg.chat.id;
  try {
    await ensureSchema(env);
  } catch (e) {
    await telegramSend(
      env,
      chatId,
      `DB error: ${e instanceof Error ? e.message : "ensureSchema failed"}. Check D1 binding name is <b>DB</b>.`
    );
    return json({ ok: true, error: "schema" });
  }
  const parts = text.split(/\s+/);
  const cmd = parts[0].split("@")[0].toLowerCase();
  const args = parts.slice(1);
  if (cmd === "/whoami") {
    await telegramSend(env, chatId, await cmdWhoami(env, fromId, chatId));
    return json({ ok: true });
  }
  if (!isAdmin(env, fromId)) {
    await telegramSend(
      env,
      chatId,
      `Unauthorized.
Your Telegram id: <code>${fromId}</code>
Add it to Worker secret <b>ADMIN_IDS</b> and retry.
Or send /whoami`
    );
    return json({ ok: true, unauthorized: true, fromId });
  }
  let reply;
  try {
    reply = await dispatchCommand(env, cmd, args);
  } catch (e) {
    reply = `Error: ${e instanceof Error ? e.message : "failed"}`;
  }
  const send = await telegramSend(env, chatId, reply);
  if (!send.ok) {
    return json({
      ok: true,
      telegramSendError: send.error,
      replyPreview: String(reply).slice(0, 200)
    });
  }
  return json({ ok: true });
}

// worker/src/lib/authHandlers.js
async function handleLogin(request, env) {
  if (!requireAppKey(request, env)) return unauthorized("Invalid API key");
  await ensureSchema(env);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!rateLimitOk(ip)) return json({ ok: false, error: "Too many attempts. Try later." }, 429);
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const username = normUsername(body.username);
  const password = String(body.password || "");
  if (!username || !password) return badRequest("Username and password required");
  const user = await env.DB.prepare(
    `SELECT id, username, password_hash, password_salt, status, expires_at FROM users WHERE username = ? COLLATE NOCASE`
  ).bind(username).first();
  if (!user || user.status !== "active") return unauthorized("Invalid credentials");
  if (isAccountExpired(user)) {
    await purgeExpiredUser(env, user.id);
    return unauthorized("Trial account expired. Please contact support.");
  }
  if (!await verifyPassword(password, user.password_salt, user.password_hash)) {
    return unauthorized("Invalid credentials");
  }
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id).run();
  const token = bufToHex(randomBytes(32));
  const tokenHash = await sha256Hex(token);
  const created = nowIso();
  const expires = expiresIso();
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO sessions (user_id, token_hash, created_at, last_activity, expires_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(user.id, tokenHash, created, created, expires),
      env.DB.prepare(`UPDATE users SET last_logged_in = ? WHERE id = ?`).bind(created, user.id),
      env.DB.prepare(`INSERT INTO login_history (user_id, logged_in_at) VALUES (?, ?)`).bind(user.id, created)
    ]);
  } catch {
    await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id).run();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO sessions (user_id, token_hash, created_at, last_activity, expires_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(user.id, tokenHash, created, created, expires),
      env.DB.prepare(`UPDATE users SET last_logged_in = ? WHERE id = ?`).bind(created, user.id),
      env.DB.prepare(`INSERT INTO login_history (user_id, logged_in_at) VALUES (?, ?)`).bind(user.id, created)
    ]);
  }
  const forceRefreshAt = await getSetting(env, FORCE_REFRESH_KEY);
  return json({
    ok: true,
    token,
    username: user.username,
    expiresAt: expires,
    forceRefreshAt: forceRefreshAt || ""
  });
}
async function handleValidate(request, env) {
  if (!requireAppKey(request, env)) return unauthorized("Invalid API key");
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const token = String(body.token || "");
  if (!token) return unauthorized("Missing token");
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.id, s.user_id, s.expires_at AS session_expires, u.username, u.status, u.expires_at AS account_expires
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
  ).bind(tokenHash).first();
  if (!row || row.status !== "active") {
    return unauthorized("Session ended. Please log in again.");
  }
  if (row.account_expires && new Date(row.account_expires).getTime() <= Date.now()) {
    await purgeExpiredUser(env, row.user_id);
    return unauthorized("Trial account expired. Please contact support.");
  }
  if (new Date(row.session_expires).getTime() <= Date.now()) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(row.id).run();
    return unauthorized("Session expired due to inactivity. Please log in again.");
  }
  const newExp = expiresIso();
  const activity = nowIso();
  await env.DB.prepare(`UPDATE sessions SET last_activity = ?, expires_at = ? WHERE id = ?`).bind(activity, newExp, row.id).run();
  const forceRefreshAt = await getSetting(env, FORCE_REFRESH_KEY);
  return json({
    ok: true,
    username: row.username,
    userId: row.user_id,
    expiresAt: newExp,
    forceRefreshAt: forceRefreshAt || ""
  });
}
async function handleLogout(request, env) {
  if (!requireAppKey(request, env)) return unauthorized("Invalid API key");
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const token = String(body.token || "");
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
  }
  return json({ ok: true });
}
async function handleMotd(request, env) {
  if (!requireAppKey(request, env)) return unauthorized("Invalid API key");
  await ensureSchema(env);
  const motd = await getSetting(env, MOTD_KEY);
  return json({ ok: true, motd: motd || "" });
}
async function handleFeedback(request, env) {
  if (!requireAppKey(request, env)) return unauthorized("Invalid API key");
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const feedback = String(body.feedback || "").trim();
  if (!feedback) return badRequest("Feedback required");
  if (feedback.length > 2e3) return badRequest("Feedback too long (max 2000)");
  let username = normUsername(body.username || "");
  const token = String(body.token || "").trim();
  if (token) {
    const tokenHash = await sha256Hex(token);
    const row = await env.DB.prepare(
      `SELECT u.username FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    ).bind(tokenHash, nowIso()).first();
    if (row?.username) username = normUsername(row.username);
  }
  if (!username) username = "unknown";
  const time = nowIso();
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const message = `${time} ${esc(username)} ${esc(feedback)}`;
  const targets = adminIds(env);
  const extra = String(env.FEEDBACK_CHAT_ID || env.ADMIN_CHAT_ID || "").trim();
  if (extra) targets.push(extra);
  const unique = [...new Set(targets.filter(Boolean))];
  if (!unique.length) {
    return json({ ok: false, error: "No Telegram admin chat configured (ADMIN_IDS)" }, 500);
  }
  let sent = 0;
  const errors = [];
  for (const chatId of unique) {
    const r = await telegramSend(env, chatId, message);
    if (r.ok) sent += 1;
    else errors.push(r.error || "send failed");
  }
  if (sent === 0) {
    return json({ ok: false, error: errors[0] || "Failed to send to Telegram" }, 502);
  }
  return json({ ok: true, sent });
}

// worker/src/index.js
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return withCors(request, new Response(null, { status: 204 }));
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    let res;
    try {
      if (request.method === "GET" && path === "/") {
        let dbOk = false;
        let dbError = null;
        try {
          if (env.DB) {
            await ensureSchema(env);
            dbOk = true;
          } else {
            dbError = "DB binding missing";
          }
        } catch (e) {
          dbError = e instanceof Error ? e.message : "db error";
        }
        res = json({
          ok: true,
          service: "telegram-user-manager",
          time: nowIso(),
          db: dbOk,
          dbError,
          hasBotToken: Boolean(env.BOT_TOKEN),
          hasBotSecret: Boolean(env.BOT_SECRET),
          hasAppKey: Boolean(env.APP_API_KEY),
          adminCount: adminIds(env).length
        });
      } else if (request.method === "POST" && (path === "/telegram" || path.endsWith("/telegram"))) {
        res = await handleTelegram(request, env);
      } else if (request.method === "POST" && path === "/auth/login") {
        res = await handleLogin(request, env);
      } else if (request.method === "POST" && path === "/auth/validate") {
        res = await handleValidate(request, env);
      } else if (request.method === "POST" && path === "/auth/logout") {
        res = await handleLogout(request, env);
      } else if ((request.method === "GET" || request.method === "POST") && path === "/auth/motd") {
        res = await handleMotd(request, env);
      } else if (request.method === "POST" && path === "/auth/feedback") {
        res = await handleFeedback(request, env);
      } else {
        res = json({ ok: false, error: "Not found", path }, 404);
      }
    } catch (e) {
      res = json({ ok: false, error: e instanceof Error ? e.message : "internal error" }, 500);
    }
    return withCors(request, res);
  }
};
export {
  src_default as default
};
