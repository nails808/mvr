const PBKDF2_ITERATIONS = 50000;

export function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomBytes(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export function randomAlnum(n) {
  const chars = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export function randomPassword(n = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export async function sha256Hex(text) {
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bufToHex(dig);
}

async function pbkdf2Hash(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bufToHex(bits);
}

export async function hashPassword(password) {
  const salt = bufToHex(randomBytes(16));
  const hash = await pbkdf2Hash(password, salt);
  return { salt, hash };
}

export async function verifyPassword(password, salt, expectedHash) {
  return (await pbkdf2Hash(password, salt)) === expectedHash;
}
