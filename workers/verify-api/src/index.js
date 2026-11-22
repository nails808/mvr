/**
 * mvr-verify-api — Cloudflare Worker replacing Firebase RTDB + Hosting verify page.
 *
 * Routes (Firebase-compatible + clean):
 *   PUT/GET  /sessions/:id[.json]
 *   PUT/GET  /sessions/:id/scannedAt[.json]
 *   GET      /verify.html
 *   GET      /  health
 *   scheduled cron — purge expired sessions + R2 photos
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, X-Verify-Write-Key, Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}

function text(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS, ...extra },
  });
}

function withCors(res) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function normalizePath(pathname) {
  let p = pathname.replace(/\/+$/, '') || '/';
  // strip .json suffix used by Firebase REST
  if (p.endsWith('.json')) p = p.slice(0, -5);
  return p;
}

function parseSessionIdFromPath(path) {
  // /sessions/:id or /sessions/:id/scannedAt
  const m = path.match(/^\/sessions\/([a-zA-Z0-9_-]+)(?:\/(scannedAt))?$/);
  if (!m) return null;
  return { id: m[1], scannedAt: m[2] === 'scannedAt' };
}

async function ensureSchema(env) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS verify_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      licence_number TEXT,
      licence_status TEXT,
      proficiency TEXT,
      licence_expiry TEXT,
      dob TEXT,
      licence_type TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      photo_r2_key TEXT,
      scanned_at INTEGER,
      created_row_at TEXT DEFAULT (datetime('now'))
    )`),
    env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_verify_sessions_expires ON verify_sessions(expires_at)`
    ),
  ]);
}

function checkWriteAuth(request, env) {
  const required = (env.VERIFY_WRITE_KEY || '').trim();
  if (!required) return true; // open writes (Firebase parity)
  const key =
    request.headers.get('X-Verify-Write-Key') ||
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  return key === required;
}

function rowToSession(row, photoBase64) {
  return {
    name: row.name,
    address: row.address || '',
    licenceNumber: row.licence_number || '',
    licenceStatus: row.licence_status || '',
    proficiency: row.proficiency || '',
    licenceExpiry: row.licence_expiry || '',
    dob: row.dob || '',
    licenceType: row.licence_type || '',
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    photoBase64: photoBase64,
    scannedAt: row.scanned_at,
  };
}

async function loadPhotoBase64(env, r2Key) {
  if (!r2Key || !env.PHOTOS) return null;
  try {
    const obj = await env.PHOTOS.get(r2Key);
    if (!obj) return null;
    const buf = await obj.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

async function storePhoto(env, sessionId, photoBase64) {
  if (!photoBase64 || !env.PHOTOS) return null;
  const key = `photos/${sessionId}.jpg`;
  // strip data-url prefix if present
  const raw = String(photoBase64).replace(/^data:image\/\w+;base64,/, '');
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  await env.PHOTOS.put(key, bytes, {
    httpMetadata: { contentType: 'image/jpeg' },
  });
  return key;
}

async function deletePhoto(env, r2Key) {
  if (!r2Key || !env.PHOTOS) return;
  try {
    await env.PHOTOS.delete(r2Key);
  } catch {
    /* ignore */
  }
}

async function handlePutSession(env, id, body) {
  const name = String(body.name || '').trim() || 'UNKNOWN';
  const createdAt = Number(body.createdAt) || Date.now();
  const expiresAt = Number(body.expiresAt) || createdAt + 120_000;
  const photoBase64 = body.photoBase64 || null;

  const existing = await env.DB.prepare(`SELECT photo_r2_key FROM verify_sessions WHERE id = ?`)
    .bind(id)
    .first();
  if (existing?.photo_r2_key) {
    await deletePhoto(env, existing.photo_r2_key);
  }

  let photoKey = null;
  if (photoBase64) {
    photoKey = await storePhoto(env, id, photoBase64);
  }

  await env.DB.prepare(
    `INSERT INTO verify_sessions (
      id, name, address, licence_number, licence_status, proficiency,
      licence_expiry, dob, licence_type, created_at, expires_at, photo_r2_key, scanned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      address = excluded.address,
      licence_number = excluded.licence_number,
      licence_status = excluded.licence_status,
      proficiency = excluded.proficiency,
      licence_expiry = excluded.licence_expiry,
      dob = excluded.dob,
      licence_type = excluded.licence_type,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at,
      photo_r2_key = excluded.photo_r2_key,
      scanned_at = NULL`
  )
    .bind(
      id,
      name,
      body.address ?? '',
      body.licenceNumber ?? '',
      body.licenceStatus ?? '',
      body.proficiency ?? '',
      body.licenceExpiry ?? '',
      body.dob ?? '',
      body.licenceType ?? '',
      createdAt,
      expiresAt,
      photoKey
    )
    .run();

  // Firebase PUT returns the written JSON
  return json({
    name,
    address: body.address ?? '',
    licenceNumber: body.licenceNumber ?? '',
    licenceStatus: body.licenceStatus ?? '',
    proficiency: body.proficiency ?? '',
    licenceExpiry: body.licenceExpiry ?? '',
    dob: body.dob ?? '',
    licenceType: body.licenceType ?? '',
    createdAt,
    expiresAt,
    photoBase64: photoBase64 ? String(photoBase64).replace(/^data:image\/\w+;base64,/, '') : null,
    scannedAt: null,
  });
}

async function handleGetSession(env, id) {
  const row = await env.DB.prepare(`SELECT * FROM verify_sessions WHERE id = ?`).bind(id).first();
  if (!row) return json(null); // Firebase returns null body for missing

  if (Date.now() > row.expires_at) {
    // expired — still return null-ish behaviour for verify page
    return json(null);
  }

  const photoBase64 = await loadPhotoBase64(env, row.photo_r2_key);
  return json(rowToSession(row, photoBase64));
}

async function handlePutScannedAt(env, id, request) {
  let ts = Date.now();
  try {
    const raw = (await request.text()).trim();
    if (raw) {
      const n = Number(raw.replace(/^"|"$/g, ''));
      if (Number.isFinite(n) && n > 0) ts = n;
    }
  } catch {
    /* use now */
  }

  const result = await env.DB.prepare(
    `UPDATE verify_sessions SET scanned_at = ? WHERE id = ? AND (expires_at > ? OR expires_at IS NULL)`
  )
    .bind(ts, id, Date.now())
    .run();

  // Firebase returns the written value
  return text(String(ts));
}

async function handleGetScannedAt(env, id) {
  const row = await env.DB.prepare(`SELECT scanned_at FROM verify_sessions WHERE id = ?`)
    .bind(id)
    .first();
  if (!row || row.scanned_at == null) {
    return text('null'); // Firebase literal null
  }
  return text(String(row.scanned_at));
}

async function serveVerifyHtml(env, request) {
  try {
    if (env.ASSETS) {
      const u = new URL(request.url);
      u.pathname = '/verify.html';
      const res = await env.ASSETS.fetch(new Request(u.toString(), { method: 'GET' }));
      if (res.ok) {
        const headers = new Headers(res.headers);
        headers.set('Content-Type', 'text/html; charset=utf-8');
        for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
        headers.set('Cache-Control', 'public, max-age=60');
        return new Response(res.body, { status: 200, headers });
      }
    }
  } catch {
    /* fall through */
  }
  return text('verify.html not found — deploy public/verify.html with assets binding', 404);
}

async function purgeExpired(env) {
  if (!env.DB) return { deleted: 0 };
  const now = Date.now();
  const rows = await env.DB.prepare(
    `SELECT id, photo_r2_key FROM verify_sessions WHERE expires_at < ?`
  )
    .bind(now)
    .all();
  const list = rows?.results || [];
  for (const r of list) {
    await deletePhoto(env, r.photo_r2_key);
  }
  if (list.length) {
    await env.DB.prepare(`DELETE FROM verify_sessions WHERE expires_at < ?`).bind(now).run();
  }
  return { deleted: list.length };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    try {
      if (env.DB) await ensureSchema(env);

      if (request.method === 'GET' && (path === '/' || path === '')) {
        return json({
          ok: true,
          service: 'mvr-verify-api',
          hasDb: Boolean(env.DB),
          hasR2: Boolean(env.PHOTOS),
          writeProtected: Boolean((env.VERIFY_WRITE_KEY || '').trim()),
        });
      }

      if (request.method === 'GET' && (path === '/verify.html' || path === '/verify')) {
        return serveVerifyHtml(env, request);
      }

      // Let ASSETS handle other static files if present
      if (request.method === 'GET' && env.ASSETS && !path.startsWith('/sessions')) {
        try {
          const assetRes = await env.ASSETS.fetch(request);
          if (assetRes && assetRes.status !== 404) return withCors(assetRes);
        } catch {
          /* fall through */
        }
      }

      const parsed = parseSessionIdFromPath(path);
      if (parsed) {
        if (!env.DB) return json({ error: 'DB not configured' }, 500);

        if (parsed.scannedAt) {
          if (request.method === 'GET') return handleGetScannedAt(env, parsed.id);
          if (request.method === 'PUT' || request.method === 'POST') {
            return handlePutScannedAt(env, parsed.id, request);
          }
          return json({ error: 'Method not allowed' }, 405);
        }

        if (request.method === 'GET') return handleGetSession(env, parsed.id);
        if (request.method === 'PUT' || request.method === 'POST') {
          if (!checkWriteAuth(request, env)) {
            return json({ error: 'Unauthorized' }, 401);
          }
          let body;
          try {
            body = await request.json();
          } catch {
            return json({ error: 'Invalid JSON' }, 400);
          }
          return handlePutSession(env, parsed.id, body || {});
        }
        return json({ error: 'Method not allowed' }, 405);
      }

      return json({ error: 'Not found', path }, 404);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'internal error' }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        try {
          if (env.DB) await ensureSchema(env);
          await purgeExpired(env);
        } catch {
          /* ignore */
        }
      })()
    );
  },
};
