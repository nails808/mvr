import {
  FORCE_REFRESH_KEY,
  MOTD_KEY,
  adminIds,
  isAdmin,
  nowIso,
  normUsername,
  trialExpiresIso,
} from './constants.js';
import { hashPassword, randomAlnum, randomPassword } from './crypto.js';
import { getSetting, setSetting } from './db.js';

export async function cmdAdd(env, args) {
  const [username, password] = args;
  if (!username || !password) return 'Usage: /add username password';
  const u = normUsername(username);
  if (u.length < 2) return 'Username too short.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  const { salt, hash } = await hashPassword(password);
  try {
    await env.DB.prepare(
      `INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)`
    )
      .bind(u, hash, salt)
      .run();
  } catch {
    return `User <b>${u}</b> already exists.`;
  }
  return `Created user <b>${u}</b>.`;
}

export async function cmdTrial(env) {
  const username = `trial_${randomAlnum(8)}@trial.local`;
  const password = randomPassword(10);
  const { salt, hash } = await hashPassword(password);
  const expires = trialExpiresIso();
  try {
    await env.DB.prepare(
      `INSERT INTO users (username, password_hash, password_salt, expires_at) VALUES (?, ?, ?, ?)`
    )
      .bind(username, hash, salt, expires)
      .run();
  } catch (e) {
    return `Failed to create trial: ${e instanceof Error ? e.message : 'error'}`;
  }
  return (
    `<b>Trial account created</b> (expires in 24h)\n\n` +
    `Username: <code>${username}</code>\n` +
    `Password: <code>${password}</code>\n` +
    `Expires: ${expires}`
  );
}

export async function cmdMotd(env, args) {
  if (!args.length) {
    const current = await getSetting(env, MOTD_KEY);
    if (!current) return 'MOTD is empty.\nUsage: /motd your message here\nClear: /motd clear';
    return `<b>Current MOTD</b>\n${current}`;
  }
  if (args.length === 1 && args[0].toLowerCase() === 'clear') {
    await setSetting(env, MOTD_KEY, '');
    return 'MOTD cleared.';
  }
  const message = args.join(' ').trim();
  if (!message) return 'Usage: /motd your message here';
  if (message.length > 2000) return 'MOTD too long (max 2000 characters).';
  await setSetting(env, MOTD_KEY, message);
  return `<b>MOTD updated</b>\n${message}`;
}

export async function cmdDel(env, args) {
  const u = normUsername(args[0]);
  if (!u) return 'Usage: /del username';
  const user = await env.DB.prepare(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`)
    .bind(u)
    .first();
  if (!user) return `User <b>${u}</b> not found.`;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id),
    env.DB.prepare(`DELETE FROM login_history WHERE user_id = ?`).bind(user.id),
    env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(user.id),
  ]);
  return `Deleted user <b>${u}</b> and terminated sessions.`;
}

export async function cmdEdit(env, args) {
  const [username, password] = args;
  if (!username || !password) return 'Usage: /edit username password';
  const u = normUsername(username);
  if (password.length < 6) return 'Password must be at least 6 characters.';
  const user = await env.DB.prepare(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`)
    .bind(u)
    .first();
  if (!user) return `User <b>${u}</b> not found.`;
  const { salt, hash } = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?`).bind(
      hash,
      salt,
      user.id
    ),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id),
  ]);
  return `Password updated for <b>${u}</b>. Active sessions terminated.`;
}

export async function cmdSearch(env, args) {
  const u = normUsername(args[0]);
  if (!u) return 'Usage: /search username';
  const user = await env.DB.prepare(
    `SELECT id, username, created_at, last_logged_in, status, expires_at FROM users WHERE username = ? COLLATE NOCASE`
  )
    .bind(u)
    .first();
  if (!user) return `User <b>${u}</b> not found.`;
  const sess = await env.DB.prepare(
    `SELECT created_at, last_activity, expires_at FROM sessions WHERE user_id = ?`
  )
    .bind(user.id)
    .first();
  let sessionLine = 'Session: none';
  if (sess) {
    const active = new Date(sess.expires_at).getTime() > Date.now();
    sessionLine = `Session: ${active ? 'ACTIVE' : 'expired'}\nCreated: ${sess.created_at}\nLast activity: ${sess.last_activity}\nExpires: ${sess.expires_at}`;
  }
  let trialLine = 'Account expiry: permanent';
  if (user.expires_at) {
    const expired = new Date(user.expires_at).getTime() <= Date.now();
    trialLine = `Account expiry: ${user.expires_at}${expired ? ' (EXPIRED)' : ''}`;
  }
  return `<b>${user.username}</b> (id ${user.id})\nStatus: ${user.status}\nCreated: ${user.created_at}\nLast login: ${user.last_logged_in || 'never'}\n${trialLine}\n${sessionLine}`;
}

export async function cmdList(env) {
  const { results } = await env.DB.prepare(
    `SELECT username, status, last_logged_in, expires_at FROM users ORDER BY username COLLATE NOCASE`
  ).all();
  if (!results?.length) return 'No users.';
  return results
    .map((r) => {
      const trial = r.expires_at ? ` trial→${r.expires_at}` : '';
      return `• <b>${r.username}</b> [${r.status}] last=${r.last_logged_in || 'never'}${trial}`;
    })
    .join('\n');
}

export async function cmdCount(env) {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS c FROM users`).first();
  return `Total users: <b>${row?.c ?? 0}</b>`;
}

export async function cmdRecent(env) {
  const { results } = await env.DB.prepare(
    `SELECT u.username, h.logged_in_at FROM login_history h JOIN users u ON u.id = h.user_id ORDER BY h.logged_in_at DESC LIMIT 15`
  ).all();
  if (!results?.length) return 'No login history.';
  return results.map((r) => `• <b>${r.username}</b> — ${r.logged_in_at}`).join('\n');
}

export async function cmdKick(env, args) {
  const u = normUsername(args[0]);
  if (!u) return 'Usage: /kick username';
  const user = await env.DB.prepare(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`)
    .bind(u)
    .first();
  if (!user) return `User <b>${u}</b> not found.`;
  const res = await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id).run();
  const n = res?.meta?.changes ?? 0;
  return n
    ? `Kicked <b>${u}</b> — session terminated.`
    : `<b>${u}</b> had no active session.`;
}

export async function cmdDisable(env, args) {
  const u = normUsername(args[0]);
  if (!u) return 'Usage: /disable username';
  const user = await env.DB.prepare(
    `SELECT id, username, status FROM users WHERE username = ? COLLATE NOCASE`
  )
    .bind(u)
    .first();
  if (!user) return `User <b>${u}</b> not found.`;
  if (user.status === 'disabled') return `<b>${user.username}</b> is already disabled.`;
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET status = 'disabled' WHERE id = ?`).bind(user.id),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id),
  ]);
  return `Disabled <b>${user.username}</b> and terminated sessions.`;
}

export async function cmdEnable(env, args) {
  const u = normUsername(args[0]);
  if (!u) return 'Usage: /enable username';
  const user = await env.DB.prepare(
    `SELECT id, username, status, expires_at FROM users WHERE username = ? COLLATE NOCASE`
  )
    .bind(u)
    .first();
  if (!user) return `User <b>${u}</b> not found.`;
  if (user.expires_at && new Date(user.expires_at).getTime() <= Date.now()) {
    return `<b>${user.username}</b> has an expired trial (${user.expires_at}). Use /extend ${user.username} &lt;hours&gt; first.`;
  }
  if (user.status === 'active') return `<b>${user.username}</b> is already active.`;
  await env.DB.prepare(`UPDATE users SET status = 'active' WHERE id = ?`).bind(user.id).run();
  return `Enabled <b>${user.username}</b>.`;
}

export async function cmdOnline(env) {
  const now = nowIso();
  const { results } = await env.DB.prepare(
    `SELECT u.username, s.last_activity, s.expires_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.expires_at > ?
     ORDER BY s.last_activity DESC LIMIT 50`
  )
    .bind(now)
    .all();
  if (!results?.length) return 'No active sessions.';
  return (
    `<b>Online (${results.length})</b>\n` +
    results
      .map((r) => `• <b>${r.username}</b>\n  last=${r.last_activity}\n  session→${r.expires_at}`)
      .join('\n')
  );
}

export async function cmdStats(env) {
  const now = nowIso();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const total = await env.DB.prepare(`SELECT COUNT(*) AS c FROM users`).first();
  const activeUsers = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE status = 'active'`
  ).first();
  const disabled = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE status = 'disabled'`
  ).first();
  const trialsActive = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE expires_at IS NOT NULL AND expires_at > ?`
  )
    .bind(now)
    .first();
  const trialsExpired = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE expires_at IS NOT NULL AND expires_at <= ?`
  )
    .bind(now)
    .first();
  const sessions = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?`
  )
    .bind(now)
    .first();
  const logins24 = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM login_history WHERE logged_in_at > ?`
  )
    .bind(dayAgo)
    .first();
  const logins7 = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM login_history WHERE logged_in_at > ?`
  )
    .bind(weekAgo)
    .first();
  return (
    `<b>Stats</b>\nUsers total: <b>${total?.c ?? 0}</b>\n  active: ${activeUsers?.c ?? 0}\n  disabled: ${disabled?.c ?? 0}\n` +
    `Trials active: ${trialsActive?.c ?? 0}\nTrials expired: ${trialsExpired?.c ?? 0}\n` +
    `Active sessions: <b>${sessions?.c ?? 0}</b>\nLogins (24h): ${logins24?.c ?? 0}\nLogins (7d): ${logins7?.c ?? 0}`
  );
}

export async function cmdExtend(env, args) {
  const u = normUsername(args[0]);
  const hoursRaw = args[1];
  if (!u || hoursRaw == null) {
    return 'Usage: /extend username hours\nExample: /extend trial_abc@trial.local 48';
  }
  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 365) {
    return 'Hours must be a positive number (max 8760).';
  }
  const user = await env.DB.prepare(
    `SELECT id, username, status, expires_at FROM users WHERE username = ? COLLATE NOCASE`
  )
    .bind(u)
    .first();
  if (!user) return `User <b>${u}</b> not found.`;
  const baseMs =
    user.expires_at && new Date(user.expires_at).getTime() > Date.now()
      ? new Date(user.expires_at).getTime()
      : Date.now();
  const newExp = new Date(baseMs + hours * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(`UPDATE users SET expires_at = ?, status = 'active' WHERE id = ?`)
    .bind(newExp, user.id)
    .run();
  return `Extended <b>${user.username}</b> by ${hours}h.\nNew expiry: ${newExp}\nStatus: active`;
}

export async function cmdPurgeTrials(env, args) {
  const target = (args[0] || 'trials').toLowerCase();
  if (target !== 'trials') return 'Usage: /purge trials';
  const now = nowIso();
  const { results } = await env.DB.prepare(
    `SELECT id, username, expires_at FROM users WHERE expires_at IS NOT NULL AND expires_at <= ?`
  )
    .bind(now)
    .all();
  if (!results?.length) return 'No expired trial accounts to purge.';
  for (const row of results) {
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET status = 'disabled' WHERE id = ?`).bind(row.id),
      env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(row.id),
    ]);
  }
  const names = results
    .slice(0, 20)
    .map((r) => `• ${r.username} (${r.expires_at})`)
    .join('\n');
  const more = results.length > 20 ? `\n…and ${results.length - 20} more` : '';
  return `<b>Purged ${results.length} expired trial(s)</b>\nAccounts disabled; sessions cleared.\n${names}${more}`;
}

export async function cmdRefresh(env) {
  const ts = nowIso();
  await setSetting(env, FORCE_REFRESH_KEY, ts);
  return `<b>Force refresh issued</b>\nToken: <code>${ts}</code>\n\nOnline clients hard-reload within ~1 minute.`;
}

export async function cmdWhoami(env, fromId, chatId) {
  const admins = adminIds(env);
  const ok = isAdmin(env, fromId);
  return (
    `<b>Whoami</b>\nYour Telegram id: <code>${fromId}</code>\nChat id: <code>${chatId}</code>\n` +
    `Admin: ${ok ? 'YES' : 'NO'}\nConfigured ADMIN_IDS: <code>${admins.join(', ') || '(empty)'}</code>\n\n` +
    (ok
      ? 'You can run admin commands.'
      : 'Add your id to Worker secret <b>ADMIN_IDS</b>, then retry.')
  );
}

export function helpText() {
  return (
    '<b>Telegram User Manager</b>\n\n/whoami\n/add username password\n/trial\n/extend username hours\n' +
    '/disable username\n/enable username\n/del username\n/edit username password\n/search username\n' +
    '/list\n/online\n/stats\n/count\n/recent\n/kick username\n/purge trials\n/motd [message]\n/motd clear\n/refresh\n/help'
  );
}

export async function dispatchCommand(env, cmd, args) {
  switch (cmd) {
    case '/add':
      return cmdAdd(env, args);
    case '/trial':
      return cmdTrial(env);
    case '/motd':
      return cmdMotd(env, args);
    case '/del':
      return cmdDel(env, args);
    case '/edit':
      return cmdEdit(env, args);
    case '/search':
      return cmdSearch(env, args);
    case '/list':
      return cmdList(env);
    case '/count':
      return cmdCount(env);
    case '/recent':
      return cmdRecent(env);
    case '/kick':
      return cmdKick(env, args);
    case '/disable':
      return cmdDisable(env, args);
    case '/enable':
      return cmdEnable(env, args);
    case '/online':
      return cmdOnline(env);
    case '/stats':
      return cmdStats(env);
    case '/extend':
      return cmdExtend(env, args);
    case '/purge':
      return cmdPurgeTrials(env, args);
    case '/refresh':
      return cmdRefresh(env);
    case '/help':
    case '/start':
      return helpText();
    default:
      return 'Unknown command. /help';
  }
}
