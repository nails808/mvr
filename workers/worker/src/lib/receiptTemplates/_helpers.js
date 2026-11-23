export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatWhen(ts) {
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

export function displayAmount(amount) {
  const a = String(amount || '').trim();
  if (!a) return '$0.00';
  if (a.includes('$')) return a;
  if (/^-?[\d,]+(\.\d+)?$/.test(a.replace(/\s/g, ''))) {
    return `$${a.replace(/\s/g, '')}`;
  }
  return a;
}

/** Build safe view-model for templates */
export function receiptVars({ amount, senderName, createdAt, receiptId }) {
  return {
    amount: escapeHtml(displayAmount(amount)),
    senderName: escapeHtml(senderName),
    when: escapeHtml(formatWhen(createdAt)),
    receiptId: escapeHtml(receiptId),
    amountRaw: displayAmount(amount),
    senderNameRaw: String(senderName ?? ''),
    whenRaw: formatWhen(createdAt),
    receiptIdRaw: String(receiptId ?? ''),
  };
}
