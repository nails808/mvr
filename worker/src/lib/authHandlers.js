import { FORCE_REFRESH_KEY, MOTD_KEY, expiresIso, nowIso, normUsername } from './constants.js';
import { randomBytes, sha256Hex, verifyPassword, bufToHex } from './crypto.js';
import { ensureSchema, getSetting, isAccountExpired, purgeExpiredUser } from './db.js';
import { badRequest, json, requireAppKey, unauthorized } from './http.js';
import { rateLimitOk } from './rateLimit.js';

export async function handleLogin(request, env) {
  if (!requireAppKey(request, env)) return unauthorized('Invalid API key');
  await ensureSchema(env);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!rateLimitOk(ip)) return json({ ok: false, error: 'Too many attempts. Try later.' }, 429);
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const username = normUsername(body.username);
  const password = String(body.password || '');
  if (!username || !password) return badRequest('Username and password required');
  const user = await env.DB.prepare(
    `SELECT id, username, password_hash, password_salt, status, expires_at FROM users WHERE username = ? COLLATE NOCASE`
  )
    .bind(username)
    .first();
  if (!user || user.status !== 'active') return unauthorized('Invalid credentials');
  if (isAccountExpired(user)) {
    await purgeExpiredUser(env, user.id);
    return unauthorized('Trial account expired. Please contact support.');
  }
  if (!(await verifyPassword(password, user.password_salt, user.password_hash))) {
    return unauthorized('Invalid credentials');
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
      env.DB.prepare(`INSERT INTO login_history (user_id, logged_in_at) VALUES (?, ?)`).bind(user.id, created),
    ]);
  } catch {
    await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id).run();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO sessions (user_id, token_hash, created_at, last_activity, expires_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(user.id, tokenHash, created, created, expires),
      env.DB.prepare(`UPDATE users SET last_logged_in = ? WHERE id = ?`).bind(created, user.id),
      env.DB.prepare(`INSERT INTO login_history (user_id, logged_in_at) VALUES (?, ?)`).bind(user.id, created),
    ]);
  }
  const forceRefreshAt = await getSetting(env, FORCE_REFRESH_KEY);
  return json({
    ok: true,
    token,
    username: user.username,
    expiresAt: expires,
    forceRefreshAt: forceRefreshAt || '',
  });
}

export async function handleValidate(request, env) {
  if (!requireAppKey(request, env)) return unauthorized('Invalid API key');
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const token = String(body.token || '');
  if (!token) return unauthorized('Missing token');
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.id, s.user_id, s.expires_at AS session_expires, u.username, u.status, u.expires_at AS account_expires
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first();
  if (!row || row.status !== 'active') {
    return unauthorized('Session ended. Please log in again.');
  }
  if (row.account_expires && new Date(row.account_expires).getTime() <= Date.now()) {
    await purgeExpiredUser(env, row.user_id);
    return unauthorized('Trial account expired. Please contact support.');
  }
  if (new Date(row.session_expires).getTime() <= Date.now()) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(row.id).run();
    return unauthorized('Session expired due to inactivity. Please log in again.');
  }
  const newExp = expiresIso();
  const activity = nowIso();
  await env.DB.prepare(`UPDATE sessions SET last_activity = ?, expires_at = ? WHERE id = ?`)
    .bind(activity, newExp, row.id)
    .run();
  const forceRefreshAt = await getSetting(env, FORCE_REFRESH_KEY);
  return json({
    ok: true,
    username: row.username,
    userId: row.user_id,
    expiresAt: newExp,
    forceRefreshAt: forceRefreshAt || '',
  });
}

export async function handleLogout(request, env) {
  if (!requireAppKey(request, env)) return unauthorized('Invalid API key');
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const token = String(body.token || '');
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
  }
  return json({ ok: true });
}

export async function handleMotd(request, env) {
  if (!requireAppKey(request, env)) return unauthorized('Invalid API key');
  await ensureSchema(env);
  const motd = await getSetting(env, MOTD_KEY);
  return json({ ok: true, motd: motd || '' });
}
