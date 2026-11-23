/**
 * GET /pay/receipt/:id — loads per-bank template from receiptTemplates/<bank>.js
 */
import { renderBankReceipt } from './receiptTemplates/index.js';

export async function handlePayReceipt(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const m = path.match(/^\/pay\/receipt\/([a-zA-Z0-9_-]+)$/);
  if (!m) {
    return new Response('Not found', { status: 404 });
  }
  const id = m[1];
  if (!env.DB) {
    return new Response('Database unavailable', { status: 503 });
  }

  let row;
  try {
    row = await env.DB.prepare(
      `SELECT id, amount, sender_name, created_at, bank, description, phone FROM pay_receipts WHERE id = ?`
    )
      .bind(id)
      .first();
  } catch {
    row = await env.DB.prepare(
      `SELECT id, amount, sender_name, created_at FROM pay_receipts WHERE id = ?`
    )
      .bind(id)
      .first();
  }

  if (!row) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h1>Receipt not found</h1>
        <p>This payment notice may have expired or the link is invalid.</p>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const html = renderBankReceipt(row.bank || 'commbank', {
    amount: row.amount,
    senderName: row.sender_name,
    createdAt: row.created_at,
    receiptId: row.id,
    description: row.description,
    phone: row.phone,
  });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
