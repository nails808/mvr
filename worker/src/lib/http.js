export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function unauthorized(msg = 'Unauthorized') {
  return json({ ok: false, error: msg }, 401);
}

export function badRequest(msg) {
  return json({ ok: false, error: msg }, 400);
}

export function withCors(request, response) {
  const origin = request.headers.get('Origin') || '*';
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'content-type, x-app-api-key');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function requireAppKey(request, env) {
  const key = request.headers.get('X-App-Api-Key') || '';
  return Boolean(key && env.APP_API_KEY && key === env.APP_API_KEY);
}
