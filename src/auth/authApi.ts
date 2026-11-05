/**
 * Calls Cloudflare Worker auth endpoints directly from the browser.
 * APP_API_KEY and WORKER_URL come from Vite env (VITE_*).
 *
 * Security note: any VITE_ secret is visible in the built JS bundle.
 */

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined)?.replace(/\/+$/, '') || '';
const APP_API_KEY = (import.meta.env.VITE_APP_API_KEY as string | undefined) || '';

const TOKEN_KEY = 'mvr_session_token';
const USER_KEY = 'mvr_session_user';

export type SessionInfo = {
  ok: true;
  username: string;
  expiresAt?: string;
};

function workerHeaders(): HeadersInit {
  return {
    'content-type': 'application/json',
    'X-App-Api-Key': APP_API_KEY,
  };
}

async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUsername(): string | null {
  try {
    return sessionStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

function storeSession(token: string, username: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, username);
}

export function clearStoredSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export async function loginRequest(username: string, password: string) {
  if (!WORKER_URL || !APP_API_KEY) {
    return {
      status: 500,
      data: {
        ok: false,
        error: 'Auth not configured. Set VITE_WORKER_URL and VITE_APP_API_KEY.',
      },
    };
  }
  const res = await fetch(`${WORKER_URL}/auth/login`, {
    method: 'POST',
    headers: workerHeaders(),
    body: JSON.stringify({ username, password }),
  });
  const data = await parseJson(res);
  if (data?.ok && data.token) {
    storeSession(String(data.token), String(data.username || username));
  }
  return { status: res.status, data };
}

export async function fetchSession(): Promise<SessionInfo | { ok: false; error?: string }> {
  const token = getStoredToken();
  if (!token) return { ok: false, error: 'Not authenticated' };
  if (!WORKER_URL || !APP_API_KEY) {
    return { ok: false, error: 'Auth not configured' };
  }
  const res = await fetch(`${WORKER_URL}/auth/validate`, {
    method: 'POST',
    headers: workerHeaders(),
    body: JSON.stringify({ token }),
  });
  const data = await parseJson(res);
  if (data?.ok) {
    if (data.username) sessionStorage.setItem(USER_KEY, String(data.username));
    return {
      ok: true,
      username: String(data.username || getStoredUsername() || ''),
      expiresAt: data.expiresAt,
    };
  }
  clearStoredSession();
  return { ok: false, error: data?.error || 'Invalid session' };
}

export async function logoutRequest() {
  const token = getStoredToken();
  if (token && WORKER_URL && APP_API_KEY) {
    try {
      await fetch(`${WORKER_URL}/auth/logout`, {
        method: 'POST',
        headers: workerHeaders(),
        body: JSON.stringify({ token }),
      });
    } catch {
      /* still clear local session */
    }
  }
  clearStoredSession();
  return { ok: true };
}
