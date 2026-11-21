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

export async function ensurePushSubscription(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'Push not supported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, error: 'VAPID public key not configured' };
  if (!WORKER_URL || !APP_API_KEY) return { ok: false, error: 'Worker not configured' };

  const token = getStoredToken();
  if (!token) return { ok: false, error: 'Not logged in' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: 'Notification permission denied' };
    }

    const reg = await navigator.serviceWorker.ready;
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

