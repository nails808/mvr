/**
 * myVicRoads auth Worker (modular)
 * POST /auth/login | validate | logout | motd
 * POST /telegram
 * GET  /
 */
import { handleLogin, handleLogout, handleMotd, handleValidate } from './lib/authHandlers.js';
import { adminIds, nowIso } from './lib/constants.js';
import { ensureSchema } from './lib/db.js';
import { json, withCors } from './lib/http.js';
import { handleTelegram } from './lib/telegram.js';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return withCors(request, new Response(null, { status: 204 }));
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    let res;
    try {
      if (request.method === 'GET' && path === '/') {
        let dbOk = false;
        let dbError = null;
        try {
          if (env.DB) {
            await ensureSchema(env);
            dbOk = true;
          } else {
            dbError = 'DB binding missing';
          }
        } catch (e) {
          dbError = e instanceof Error ? e.message : 'db error';
        }
        res = json({
          ok: true,
          service: 'telegram-user-manager',
          time: nowIso(),
          db: dbOk,
          dbError,
          hasBotToken: Boolean(env.BOT_TOKEN),
          hasBotSecret: Boolean(env.BOT_SECRET),
          hasAppKey: Boolean(env.APP_API_KEY),
          adminCount: adminIds(env).length,
        });
      } else if (
        request.method === 'POST' &&
        (path === '/telegram' || path.endsWith('/telegram'))
      ) {
        res = await handleTelegram(request, env);
      } else if (request.method === 'POST' && path === '/auth/login') {
        res = await handleLogin(request, env);
      } else if (request.method === 'POST' && path === '/auth/validate') {
        res = await handleValidate(request, env);
      } else if (request.method === 'POST' && path === '/auth/logout') {
        res = await handleLogout(request, env);
      } else if (
        (request.method === 'GET' || request.method === 'POST') &&
        path === '/auth/motd'
      ) {
        res = await handleMotd(request, env);
      } else {
        res = json({ ok: false, error: 'Not found', path }, 404);
      }
    } catch (e) {
      res = json({ ok: false, error: e instanceof Error ? e.message : 'internal error' }, 500);
    }
    return withCors(request, res);
  },
};
