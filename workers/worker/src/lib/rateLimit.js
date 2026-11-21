import { LOGIN_WINDOW_MS, MAX_LOGIN_ATTEMPTS } from './constants.js';

const loginAttempts = new Map();

export function rateLimitOk(ip) {
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
