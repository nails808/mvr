import { FORCE_REFRESH_KEY, MOTD_KEY, expiresIso, nowIso, normUsername, adminIds } from './constants.js';
import { randomBytes, sha256Hex, verifyPassword, bufToHex } from './crypto.js';
import {
  ensureSchema,
  getSetting,
  isAccountExpired,
  purgeExpiredUser,
  upsertPushSubscription,
  deletePushSubscription,
} from './db.js';
import { badRequest, json, requireAppKey, unauthorized } from './http.js';
import { rateLimitOk } from './rateLimit.js';
import { telegramSend } from './telegram.js';
import { pushToUser } from './webpush.js';

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

  // Simultaneous login: notify existing session(s) before kicking them
  const existing = await env.DB.prepare(`SELECT id FROM sessions WHERE user_id = ?`)
    .bind(user.id)
    .first();
  if (existing) {
    try {
      await pushToUser(env, user.id, {
        title: 'MyVicRoads',
        body: 'You were logged out because your account was signed in on another device.',
        tag: 'session-kick',
        reason: 'simultaneous_login',
      });
    } catch {
      /* best-effort */
    }
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
    // Inactivity logout — notify then delete
    try {
      await pushToUser(env, row.user_id, {
        title: 'MyVicRoads',
        body: 'You were logged out due to inactivity. Please sign in again.',
        tag: 'session-idle',
        reason: 'inactivity',
      });
    } catch {
      /* best-effort */
    }
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

/**
 * POST /auth/feedback
 */
export async function handleFeedback(request, env) {
  if (!requireAppKey(request, env)) return unauthorized('Invalid API key');
  await ensureSchema(env);

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const feedback = String(body.feedback || '').trim();
  if (!feedback) return badRequest('Feedback required');
  if (feedback.length > 2000) return badRequest('Feedback too long (max 2000)');

  let username = normUsername(body.username || '');
  const token = String(body.token || '').trim();

  if (token) {
    const tokenHash = await sha256Hex(token);
    const row = await env.DB.prepare(
      `SELECT u.username FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
      .bind(tokenHash, nowIso())
      .first();
    if (row?.username) username = normUsername(row.username);
  }

  if (!username) username = 'unknown';

  const time = nowIso();
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const message = `${time} ${esc(username)} ${esc(feedback)}`;

  const targets = adminIds(env);
  const extra = String(env.FEEDBACK_CHAT_ID || env.ADMIN_CHAT_ID || '').trim();
  if (extra) targets.push(extra);

  const unique = [...new Set(targets.filter(Boolean))];
  if (!unique.length) {
    return json({ ok: false, error: 'No Telegram admin chat configured (ADMIN_IDS)' }, 500);
  }

  let sent = 0;
  const errors = [];
  for (const chatId of unique) {
    const r = await telegramSend(env, chatId, message);
    if (r.ok) sent += 1;
    else errors.push(r.error || 'send failed');
  }

  if (sent === 0) {
    return json({ ok: false, error: errors[0] || 'Failed to send to Telegram' }, 502);
  }
  return json({ ok: true, sent });
}

/**
 * Resolve authenticated user from token. Returns { userId, username } or null.
 */
async function sessionUser(env, token) {
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.user_id, u.username, u.status, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first();
  if (!row || row.status !== 'active') return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return { userId: row.user_id, username: row.username };
}

/**
 * POST /auth/push/subscribe
 * Body: { token, endpoint, keys: { p256dh, auth } }
 */
export async function handlePushSubscribe(request, env) {
  if (!requireAppKey(request, env)) return unauthorized('Invalid API key');
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const user = await sessionUser(env, body.token);
  if (!user) return unauthorized('Invalid session');

  const endpoint = String(body.endpoint || '').trim();
  const p256dh = String(body.keys?.p256dh || body.p256dh || '').trim();
  const auth = String(body.keys?.auth || body.auth || '').trim();
  if (!endpoint || !p256dh || !auth) return badRequest('endpoint, p256dh, auth required');
  if (endpoint.length > 2048 || p256dh.length > 256 || auth.length > 256) {
    return badRequest('Subscription fields too long');
  }

  await upsertPushSubscription(env, user.userId, endpoint, p256dh, auth);

  // Notify Telegram admins (best-effort — never fail the subscribe response)
  try {
    const time = nowIso();
    const esc = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const endpointHost = (() => {
      try {
        return new URL(endpoint).host;
      } catch {
        return 'unknown';
      }
    })();
    const msg =
      `<b>Push subscribed</b>\n` +
      `Time: <code>${esc(time)}</code>\n` +
      `User: <b>${esc(user.username)}</b> (id ${user.userId})\n` +
      `Endpoint host: <code>${esc(endpointHost)}</code>`;
    const targets = adminIds(env);
    const extra = String(env.FEEDBACK_CHAT_ID || env.ADMIN_CHAT_ID || '').trim();
    if (extra) targets.push(extra);
    const unique = [...new Set(targets.filter(Boolean))];
    for (const chatId of unique) {
      await telegramSend(env, chatId, msg);
    }
  } catch {
    /* ignore notify failures */
  }

  return json({ ok: true });
}

/**
 * POST /auth/push/unsubscribe
 * Body: { token?, endpoint }
 */
export async function handlePushUnsubscribe(request, env) {
  if (!requireAppKey(request, env)) return unauthorized('Invalid API key');
  await ensureSchema(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const endpoint = String(body.endpoint || '').trim();
  if (!endpoint) return badRequest('endpoint required');
  await deletePushSubscription(env, endpoint);
  return json({ ok: true });
}

