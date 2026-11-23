/**
 * Receipt template: nab
 *
 * Edit this file (or replace entirely) to match a real bank receipt screenshot.
 * Available placeholders from vars: amount, senderName, when, receiptId
 * (already HTML-escaped). Raw variants: amountRaw, senderNameRaw, whenRaw, receiptIdRaw
 */
import { receiptVars } from './_helpers.js';

export const bankId = 'nab';
export const brandName = 'NAB';

export function render(data) {
  const v = receiptVars(data);
  const brand = 'NAB';
  const heroTitle = 'You have been paid';
  const topBg = '#c1007e';
  const topFg = '#ffffff';
  const checkBg = '#c1007e';
  const accent = '#c1007e';

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="${topBg}" />
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
      background: ${topBg};
      color: ${topFg};
      padding: 14px 16px;
      padding-top: calc(14px + env(safe-area-inset-top, 0px));
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .top .brand { font-weight: 800; font-size: 18px; letter-spacing: -0.02em; }
    .top .close {
      font-size: 15px; font-weight: 600; color: inherit;
      text-decoration: none; opacity: 0.95; padding: 6px 4px;
    }
    .hero {
      background: #fff;
      text-align: center;
      padding: 36px 20px 28px;
      border-bottom: 1px solid #e8e8e8;
    }
    .check {
      width: 64px; height: 64px; border-radius: 50%;
      background: ${checkBg};
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
    }
    .check svg { width: 32px; height: 32px; }
    .hero h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #111; }
    .hero .amount {
      font-size: 40px; font-weight: 700; letter-spacing: -0.03em;
      color: #111; margin: 8px 0 4px;
    }
    .hero .sub { font-size: 15px; color: #5c5c5c; margin-top: 6px; }
    .card {
      background: #fff;
      margin: 16px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border-top: 3px solid ${accent};
    }
    .row {
      display: flex; justify-content: space-between; gap: 12px;
      padding: 16px 18px; border-bottom: 1px solid #eee; font-size: 15px;
    }
    .row:last-child { border-bottom: none; }
    .row .label { color: #5c5c5c; flex-shrink: 0; }
    .row .value { font-weight: 600; text-align: right; color: #111; word-break: break-word; }
    .foot {
      text-align: center; padding: 20px 16px 32px;
      font-size: 12px; color: #8a8a8a; line-height: 1.45;
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
    <div class="amount">${v.amount}</div>
    <p class="sub">from ${v.senderName}</p>
  </section>
  <section class="card">
    <div class="row"><span class="label">From</span><span class="value">${v.senderName}</span></div>
    <div class="row"><span class="label">Amount</span><span class="value">${v.amount}</span></div>
    <div class="row"><span class="label">When</span><span class="value">${v.when}</span></div>
    <div class="row"><span class="label">Description</span><span class="value">${v.description}</span></div>
    ${v.hasPhone ? `<div class="row"><span class="label">Phone</span><span class="value">${v.phone}</span></div>` : ''}
    <div class="row"><span class="label">Reference</span><span class="value">${v.receiptId}</span></div>
  </section>
  <p class="foot">Demonstration receipt for notification testing.<br/>Not affiliated with ${brand} or any bank.</p>
</body>
</html>`;
}
