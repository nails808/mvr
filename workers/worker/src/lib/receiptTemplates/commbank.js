/**
 * Receipt template: CommBank / CBA
 * Mobile fullscreen layout matched to CBA Receipt / Osko screenshot.
 */
import { receiptVars, escapeHtml } from './_helpers.js';

export const bankId = 'commbank';
export const brandName = 'CommBank';

export function render(data) {
  const v = receiptVars(data);
  const siriName = escapeHtml(String(v.targetNameRaw || '').toUpperCase());

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#ffffff" />
  <title>Receipt</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      background: #ffffff;
      color: #111;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    body {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
    .nav {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: 56px 1fr 64px;
      align-items: center;
      min-height: 52px;
      padding: 8px 8px 8px 4px;
      padding-top: calc(8px + env(safe-area-inset-top, 0px));
      background: #f7f7f7;
      border-bottom: 1px solid #e8e8e8;
    }
    .nav a {
      appearance: none;
      border: 0;
      background: transparent;
      color: #111;
      font-size: 17px;
      text-decoration: none;
      padding: 10px 12px;
    }
    .nav .title {
      text-align: center;
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .nav .share { text-align: right; }
    .nav .close {
      font-size: 28px;
      line-height: 1;
      padding: 4px 14px 10px;
      font-weight: 300;
    }
    .content {
      flex: 1;
      overflow: auto;
      padding: 28px 20px 48px;
      max-width: 480px;
      width: 100%;
      margin: 0 auto;
    }
    .check {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #34c759;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
    }
    .check svg { width: 20px; height: 20px; display: block; }
    .paid {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.15;
      color: #111;
      margin-bottom: 6px;
    }
    .phone {
      font-size: 16px;
      color: #111;
      margin-bottom: 10px;
    }
    .receipt-no {
      font-size: 15px;
      color: #8e8e93;
      margin-bottom: 28px;
    }
    .block { margin-bottom: 22px; }
    .label {
      font-size: 17px;
      font-weight: 700;
      color: #111;
      margin-bottom: 4px;
    }
    .value {
      font-size: 17px;
      color: #3a3a3c;
      line-height: 1.35;
    }
    .notice {
      font-size: 17px;
      color: #111;
      line-height: 1.4;
      margin: 8px 0 22px;
    }
    .osko-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 28px;
      color: #8e8e93;
      font-size: 17px;
    }
    .osko-word {
      font-weight: 600;
      color: #8e8e93;
      letter-spacing: -0.02em;
    }
    .osko-mark {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #8e8e93;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .osko-mark span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 2px solid #8e8e93;
      display: block;
    }
    .siri-prompt {
      font-size: 17px;
      font-weight: 700;
      color: #111;
      line-height: 1.3;
      margin-bottom: 14px;
    }
    .siri-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px 10px 12px;
      border-radius: 999px;
      border: 1px solid #d1d1d6;
      background: #fff;
      font-size: 17px;
      color: #111;
      text-decoration: none;
    }
    .siri-orb {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background:
        radial-gradient(circle at 30% 30%, #ff6b9d, transparent 50%),
        radial-gradient(circle at 70% 40%, #6b8cff, transparent 55%),
        radial-gradient(circle at 50% 80%, #5ce1e6, transparent 50%),
        #c9c9ce;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <header class="nav">
    <a class="close" href="javascript:window.close()" aria-label="Close">×</a>
    <div class="title">Receipt</div>
    <a class="share" href="javascript:void(0)">Share</a>
  </header>
  <main class="content">
    <div class="check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>

    <h1 class="paid">Paid ${v.amount}<br/>to ${v.targetName}</h1>
    ${v.hasPhone ? `<p class="phone">${v.phone}</p>` : ''}
    <p class="receipt-no">Receipt no: ${v.receiptId}</p>

    <div class="block">
      <div class="label">From</div>
      <div class="value">${v.senderName}</div>
    </div>

    <div class="block">
      <div class="label">Description</div>
      <div class="value">${v.description}</div>
    </div>

    <div class="block">
      <div class="label">Transaction Date</div>
      <div class="value">${v.when}</div>
    </div>

    <p class="notice">For security, payments to recently added payees may be held for 24 hours.</p>

    <div class="osko-row">
      <span>Sent through</span>
      <span class="osko-word">Osko</span>
      <span class="osko-mark" aria-hidden="true"><span></span></span>
    </div>

    <p class="siri-prompt">Add to Siri so you can ask to pay ${siriName}</p>
    <a class="siri-btn" href="javascript:void(0)">
      <span class="siri-orb" aria-hidden="true"></span>
      Add to Siri
    </a>
  </main>
</body>
</html>`;
}
