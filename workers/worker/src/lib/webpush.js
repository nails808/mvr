/**
 * Pure Web Crypto Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID).
 * Runs on Cloudflare Workers — no Node crypto / web-push dependency.
 */

function b64urlEncode(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function importVapidPrivateKey(privateKeyB64) {
  // Accept raw 32-byte base64url private scalar, or JSON JWK string
  const trimmed = String(privateKeyB64 || '').trim();
  if (trimmed.startsWith('{')) {
    const jwk = JSON.parse(trimmed);
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
      'sign',
    ]);
  }
  // Raw private key as base64url → JWK
  const d = trimmed;
  // We need the public key components for VAPID header; derive via export after import is awkward.
  // Prefer full JWK in secret. Fallback: treat as d only and require VAPID_PUBLIC_KEY separately.
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d,
    // x/y must be present for import in some runtimes — caller should store full JWK
  };
  try {
    return await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
      'sign',
    ]);
  } catch {
    throw new Error(
      'VAPID_PRIVATE_KEY must be a full EC JWK JSON string (generate with web-push or openssl)'
    );
  }
}

async function signVapidJwt(privateKey, audience, subject, publicKeyB64) {
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const payload = b64urlEncode(
    new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: subject }))
  );
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
  // Web Crypto returns IEEE P1363 (r||s); JWT needs that form for ES256
  const jwt = `${header}.${payload}.${b64urlEncode(sig)}`;
  return `vapid t=${jwt}, k=${publicKeyB64}`;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

/**
 * Encrypt payload per RFC 8291 (aes128gcm).
 * @param {Uint8Array} plaintext
 * @param {Uint8Array} uaPublic — subscription p256dh
 * @param {Uint8Array} authSecret — subscription auth
 */
async function encryptPayload(plaintext, uaPublic, authSecret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));

  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const ecdhBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaKey },
    asKeys.privateKey,
    256
  );

  const keyInfo = concat(
    new TextEncoder().encode('WebPush: info\0'),
    uaPublic,
    asPublicRaw
  );
  const ikm = await hkdf(authSecret, new Uint8Array(ecdhBits), keyInfo, 32);
  const cek = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  // Record size: body + 1 byte padding delimiter
  const rs = 4096;
  const padded = concat(plaintext, new Uint8Array([2])); // 0x02 padding delimiter

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  );

  // Header: salt (16) | rs (4 BE) | idlen (1) | keyid (asPublicRaw)
  const header = new Uint8Array(16 + 4 + 1 + asPublicRaw.length);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = asPublicRaw.length;
  header.set(asPublicRaw, 21);

  return concat(header, ciphertext);
}

/**
 * Send a Web Push notification to one subscription.
 * @param {object} env — needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, optional VAPID_SUBJECT
 * @param {{ endpoint: string, p256dh: string, auth: string }} sub
 * @param {string|object} payload — string body or { title, body, ... }
 */
export async function sendWebPush(env, sub, payload) {
  const publicKey = String(env.VAPID_PUBLIC_KEY || '').trim();
  const privateRaw = String(env.VAPID_PRIVATE_KEY || '').trim();
  if (!publicKey || !privateRaw) {
    return { ok: false, error: 'VAPID keys not configured' };
  }
  if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) {
    return { ok: false, error: 'Invalid subscription' };
  }

  const subject = String(env.VAPID_SUBJECT || 'mailto:admin@myvicroads.local').trim();
  const bodyText =
    typeof payload === 'string'
      ? payload
      : JSON.stringify(
          payload && typeof payload === 'object'
            ? payload
            : { title: 'MyVicRoads', body: String(payload) }
        );

  try {
    const privateKey = await importVapidPrivateKey(privateRaw);
    const audience = new URL(sub.endpoint).origin;
    const authHeader = await signVapidJwt(privateKey, audience, subject, publicKey);

    const uaPublic = b64urlDecode(sub.p256dh);
    const authSecret = b64urlDecode(sub.auth);
    const plaintext = new TextEncoder().encode(bodyText);
    const encrypted = await encryptPayload(plaintext, uaPublic, authSecret);

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'high',
      },
      body: encrypted,
    });

    if (res.status === 201 || res.status === 200) {
      return { ok: true };
    }
    // Gone / Not Found → subscription dead
    if (res.status === 404 || res.status === 410) {
      return { ok: false, error: `gone:${res.status}`, gone: true };
    }
    const text = await res.text().catch(() => '');
    return { ok: false, error: `push ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'push failed' };
  }
}

/**
 * Send to all subscriptions for a user_id. Cleans up gone endpoints.
 */
export async function pushToUser(env, userId, payload) {
  const rows = await env.DB.prepare(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`
  )
    .bind(userId)
    .all();
  const list = rows?.results || [];
  if (!list.length) return { sent: 0, failed: 0, total: 0 };

  let sent = 0;
  let failed = 0;
  for (const row of list) {
    const r = await sendWebPush(env, row, payload);
    if (r.ok) sent += 1;
    else {
      failed += 1;
      if (r.gone) {
        await env.DB.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).bind(row.id).run();
      }
    }
  }
  return { sent, failed, total: list.length };
}

/**
 * Send to every registered subscription (shout).
 */
export async function pushToAll(env, payload) {
  const rows = await env.DB.prepare(
    `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions`
  ).all();
  const list = rows?.results || [];
  let sent = 0;
  let failed = 0;
  for (const row of list) {
    const r = await sendWebPush(env, row, payload);
    if (r.ok) sent += 1;
    else {
      failed += 1;
      if (r.gone) {
        await env.DB.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).bind(row.id).run();
      }
    }
  }
  return { sent, failed, total: list.length };
}
