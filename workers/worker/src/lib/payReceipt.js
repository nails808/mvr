/**
 * GET /pay/receipt/:id — bank-styled money received screens
 */

const THEMES = {
  commbank: {
    brand: 'CommBank',
    topBg: '#ffcc00',
    topFg: '#111111',
    checkBg: '#118c4f',
    accent: '#118c4f',
    heroTitle: 'Money received',
  },
  westpac: {
    brand: 'Westpac',
    topBg: '#d5002b',
    topFg: '#ffffff',
    checkBg: '#d5002b',
    accent: '#d5002b',
    heroTitle: 'Payment received',
  },
  anz: {
    brand: 'ANZ',
    topBg: '#007dba',
    topFg: '#ffffff',
    checkBg: '#007dba',
    accent: '#007dba',
    heroTitle: 'Money in',
  },
  nab: {
    brand: 'NAB',
    topBg: '#c1007e',
    topFg: '#ffffff',
    checkBg: '#c1007e',
    accent: '#c1007e',
    heroTitle: 'You have been paid',
  },
  up: {
    brand: 'Up',
    topBg: '#ff7a00',
    topFg: '#ffffff',
    checkBg: '#111111',
    accent: '#ff7a00',
    heroTitle: 'Ka-ching',
  },
};

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatWhen(ts) {
  try {
    return new Date(Number(ts)).toLocaleString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function displayAmount(amount) {
  const a = String(amount || '').trim();
  if (!a) return '$0.00';
  if (a.includes('$')) return a;
  if (/^-?[\d,]+(\.\d+)?$/.test(a.replace(/\s/g, ''))) {
    return `$${a.replace(/\s/g, '')}`;
  }
  return a;
}

function receiptHtml({ amount, senderName, createdAt, receiptId, bank }) {
  const theme = THEMES[bank] || THEMES.commbank;
  const amt = escapeHtml(displayAmount(amount));
  const from = escapeHtml(senderName);
  const when = escapeHtml(formatWhen(createdAt));
  const ref = escapeHtml(receiptId);
  const brand = escapeHtml(theme.brand);
  const heroTitle = escapeHtml(theme.heroTitle);

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="${theme.topBg}" />
  <title>${brand} — ${heroTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f4f4f4;
      color: #1a1a1a;
      min-height: 100vh;
      min-height: 100dvh;
    }
    .top {
      background: ${theme.topBg};
      color: ${theme.topFg};
      padding: 14px 16px;
      padding-top: calc(14px + env(safe-area-inset-top, 0px));
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .top .brand {
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -0.02em;
    }
    .top .close {
      font-size: 15px;
      font-weight: 600;
      color: inherit;
      text-decoration: none;
      opacity: 0.95;
      padding: 6px 4px;
    }
    .hero {
      background: #fff;
      text-align: center;
      padding: 36px 20px 28px;
      border-bottom: 1px solid #e8e8e8;
    }
    .check {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${theme.checkBg};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .check svg { width: 32px; height: 32px; }
    .hero h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #111;
    }
    .hero .amount {
      font-size: 40px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #111;
      margin: 8px 0 4px;
    }
    .hero .sub {
      font-size: 15px;
      color: #5c5c5c;
      margin-top: 6px;
    }
    .card {
      background: #fff;
      margin: 16px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border-top: 3px solid ${theme.accent};
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid #eee;
      font-size: 15px;
    }
    .row:last-child { border-bottom: none; }
    .row .label { color: #5c5c5c; flex-shrink: 0; }
    .row .value { font-weight: 600; text-align: right; color: #111; word-break: break-word; }
    .foot {
      text-align: center;
      padding: 20px 16px 32px;
      font-size: 12px;
      color: #8a8a8a;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <header class="top">
    <div class="brand">${brand}</div>
    <a class="close" href="javascript:window.close()">Close</a>
  </header>
  <section class="hero">
    <div class="check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <h1>${heroTitle}</h1>
    <div class="amount">${amt}</div>
    <p class="sub">from ${from}</p>
  </section>
  <section class="card">
    <div class="row">
      <span class="label">From</span>
      <span class="value">${from}</span>
    </div>
    <div class="row">
      <span class="label">Amount</span>
      <span class="value">${amt}</span>
    </div>
    <div class="row">
      <span class="label">When</span>
      <span class="value">${when}</span>
    </div>
    <div class="row">
      <span class="label">Description</span>
      <span class="value">Payment received</span>
    </div>
    <div class="row">
      <span class="label">Reference</span>
      <span class="value">${ref}</span>
    </div>
  </section>
  <p class="foot">Demonstration receipt for notification testing.<br/>Not affiliated with ${brand} or any bank.</p>
</body>
</html>`;
}

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
      `SELECT id, amount, sender_name, created_at, bank FROM pay_receipts WHERE id = ?`
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
  const html = receiptHtml({
    amount: row.amount,
    senderName: row.sender_name,
    createdAt: row.created_at,
    receiptId: row.id,
    bank: row.bank || 'commbank',
  });
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
