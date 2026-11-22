import { nowIso } from './constants.js';

export async function ensureSchema(env) {
  if (!env.DB) throw new Error('D1 binding DB is missing');
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
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(endpoint),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(logged_in_at DESC)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_users_expires ON users(expires_at)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS pay_receipts (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      bank TEXT NOT NULL DEFAULT 'commbank',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_pay_receipts_user ON pay_receipts(user_id)`),
  ]);
  try {
    await env.DB.prepare(`ALTER TABLE users ADD COLUMN expires_at TEXT`).run();
  } catch {
    /* already exists */
  }
  try {
    await env.DB.prepare(`ALTER TABLE pay_receipts ADD COLUMN bank TEXT NOT NULL DEFAULT 'commbank'`).run();
  } catch {
    /* already exists */
  }
}

export async function getSetting(env, key) {
  try {
    const row = await env.DB.prepare(`SELECT value FROM settings WHERE key = ?`).bind(key).first();
    return row?.value ?? '';
  } catch {
    return '';
  }
}

export async function setSetting(env, key, value) {
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(key, value, now)
    .run();
}

export async function purgeExpiredUser(env, userId) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId),
    env.DB.prepare(`UPDATE users SET status = 'disabled' WHERE id = ?`).bind(userId),
  ]);
}

export function isAccountExpired(user) {
  if (!user || !user.expires_at) return false;
  return new Date(user.expires_at).getTime() <= Date.now();
}

export async function upsertPushSubscription(env, userId, endpoint, p256dh, auth) {
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       updated_at = excluded.updated_at`
  )
    .bind(userId, endpoint, p256dh, auth, now, now)
    .run();
}

export async function deletePushSubscription(env, endpoint) {
  await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(endpoint).run();
}


