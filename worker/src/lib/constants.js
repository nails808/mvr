export const SESSION_IDLE_MS = 15 * 60 * 1000;
export const TRIAL_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = 8;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MOTD_KEY = 'motd';
export const FORCE_REFRESH_KEY = 'force_refresh_at';

export function nowIso() {
  return new Date().toISOString();
}

export function expiresIso(fromMs = Date.now()) {
  return new Date(fromMs + SESSION_IDLE_MS).toISOString();
}

export function trialExpiresIso(fromMs = Date.now()) {
  return new Date(fromMs + TRIAL_TTL_MS).toISOString();
}

export function normUsername(u) {
  return String(u || '').trim().toLowerCase();
}

export function adminIds(env) {
  return String(env.ADMIN_IDS || '')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdmin(env, telegramUserId) {
  if (telegramUserId == null) return false;
  const id = String(telegramUserId).trim();
  return adminIds(env).some((a) => a === id);
}
