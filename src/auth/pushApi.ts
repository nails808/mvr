/**
 * Web Push subscription helpers for myVicRoads PWA.
 * Requires VITE_VAPID_PUBLIC_KEY and service worker push support.
 */

import { getStoredToken, workerHeaders, WORKER_URL, APP_API_KEY } from './authApi';

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Current Notification.permission, or "unsupported". */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

async function waitForServiceWorker(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker not supported');
  }

  // Prefer an existing registration; otherwise wait for ready with timeout
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active || existing?.installing || existing?.waiting) {
    return navigator.serviceWorker.ready;
  }

  const ready = navigator.serviceWorker.ready;
  const timed = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error('Service worker not ready — rebuild as production PWA (npm run build)')), timeoutMs);
  });
  return Promise.race([ready, timed]);
}

/**
 * Request notification permission (must be called from a user gesture on iOS)
 * and register the push subscription with the Worker.
 */
export async function ensurePushSubscription(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return { ok: false, error: 'Push not supported on this device/browser' };
  }

  const token = getStoredToken();
  if (!token) return { ok: false, error: 'Not logged in' };

  // Ask for permission FIRST so the system dialog appears even if later config fails.
  // On iOS this must run inside a user gesture (button tap / form submit).
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not request notification permission',
    };
  }

  if (permission !== 'granted') {
    return {
      ok: false,
      error:
        permission === 'denied'
          ? 'Notifications blocked — enable them in system Settings'
          : 'Notification permission not granted',
    };
  }

  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, error: 'VAPID public key not configured (VITE_VAPID_PUBLIC_KEY)' };
  }
  if (!WORKER_URL || !APP_API_KEY) {
    return { ok: false, error: 'Worker not configured (VITE_WORKER_URL / VITE_APP_API_KEY)' };
  }

  try {
    const reg = await waitForServiceWorker();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = sub.toJSON();
    const endpoint = json.endpoint || '';
    const p256dh = json.keys?.p256dh || '';
    const auth = json.keys?.auth || '';
    if (!endpoint || !p256dh || !auth) {
      return { ok: false, error: 'Incomplete subscription' };
    }

    const res = await fetch(`${WORKER_URL}/auth/push/subscribe`, {
      method: 'POST',
      headers: workerHeaders(),
      body: JSON.stringify({
        token,
        endpoint,
        keys: { p256dh, auth },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.ok) return { ok: true };
    return { ok: false, error: data?.error || 'Subscribe failed' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Subscribe error' };
  }
}
