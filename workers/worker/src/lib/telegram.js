import { isAdmin } from './constants.js';
import { ensureSchema } from './db.js';
import { badRequest, json, unauthorized } from './http.js';
import { cmdWhoami, dispatchCommand } from './commands.js';

export async function telegramSend(env, chatId, text) {
  if (!env.BOT_TOKEN) {
    console.log('telegramSend: BOT_TOKEN missing');
    return { ok: false, error: 'BOT_TOKEN missing' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: String(text).slice(0, 4000),
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      console.log('telegramSend failed', res.status, data);
      return { ok: false, error: data.description || String(res.status) };
    }
    return { ok: true };
  } catch (e) {
    console.log('telegramSend exception', e);
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}

function extractMessage(update) {
  return (
    update.message ||
    update.edited_message ||
    update.channel_post ||
    update.edited_channel_post ||
    null
  );
}

export async function handleTelegram(request, env) {
  const secretHeader =
    request.headers.get('X-Telegram-Bot-Api-Secret-Token') ||
    request.headers.get('x-telegram-bot-api-secret-token') ||
    '';
  const expected = String(env.BOT_SECRET || '').trim();
  if (!expected) return unauthorized('BOT_SECRET is not configured on the Worker');
  if (secretHeader.trim() !== expected) return unauthorized('Invalid Telegram secret');

  let update;
  try {
    update = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const msg = extractMessage(update);
  if (!msg?.chat) return json({ ok: true, ignored: 'no message' });

  const text = (msg.text || msg.caption || '').trim();
  if (!text) return json({ ok: true, ignored: 'no text' });

  const fromId = msg.from?.id;
  const chatId = msg.chat.id;

  try {
    await ensureSchema(env);
  } catch (e) {
    await telegramSend(
      env,
      chatId,
      `DB error: ${e instanceof Error ? e.message : 'ensureSchema failed'}. Check D1 binding name is <b>DB</b>.`
    );
    return json({ ok: true, error: 'schema' });
  }

  const parts = text.split(/\s+/);
  const cmd = parts[0].split('@')[0].toLowerCase();
  const args = parts.slice(1);

  if (cmd === '/whoami') {
    await telegramSend(env, chatId, await cmdWhoami(env, fromId, chatId));
    return json({ ok: true });
  }

  if (!isAdmin(env, fromId)) {
    await telegramSend(
      env,
      chatId,
      `Unauthorized.\nYour Telegram id: <code>${fromId}</code>\nAdd it to Worker secret <b>ADMIN_IDS</b> and retry.\nOr send /whoami`
    );
    return json({ ok: true, unauthorized: true, fromId });
  }

  let reply;
  try {
    reply = await dispatchCommand(env, cmd, args);
  } catch (e) {
    reply = `Error: ${e instanceof Error ? e.message : 'failed'}`;
  }

  const send = await telegramSend(env, chatId, reply);
  if (!send.ok) {
    return json({
      ok: true,
      telegramSendError: send.error,
      replyPreview: String(reply).slice(0, 200),
    });
  }
  return json({ ok: true });
}
