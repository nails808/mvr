export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format timestamp as CBA-style: 21 April 2026 12:38PM (Syd/Melb time) in Australia/Sydney */
export function formatWhenAest(ts) {
  try {
    const d = new Date(Number(ts));
    const fmt = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    // en-AU often gives "21 April 2026, 12:38 pm" — normalize to screenshot style
    let parts = fmt.formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    const day = get('day');
    const month = get('month');
    const year = get('year');
    let hour = get('hour');
    const minute = get('minute');
    let dayPeriod = (get('dayPeriod') || '').toUpperCase().replace(/\./g, '');
    if (dayPeriod === 'AM' || dayPeriod === 'PM') {
      /* ok */
    } else if (dayPeriod.toLowerCase().includes('am')) dayPeriod = 'AM';
    else if (dayPeriod.toLowerCase().includes('pm')) dayPeriod = 'PM';
    // Remove leading space quirks; match "12:38PM"
    return `${day} ${month} ${year} ${hour}:${minute}${dayPeriod} (Syd/Melb time)`;
  } catch {
    return '';
  }
}

export function displayAmount(amount) {
  const a = String(amount || '').trim();
  if (!a) return '$0.00';
  if (a.includes('$')) {
    // normalize $20 -> $20.00 if whole dollars
    const m = a.replace(/[$,]/g, '').match(/^(\d+)(?:\.(\d+))?$/);
    if (m) {
      const cents = (m[2] || '00').padEnd(2, '0').slice(0, 2);
      return `$${Number(m[1])}.${cents}`;
    }
    return a;
  }
  if (/^-?[\d,]+(\.\d+)?$/.test(a.replace(/\s/g, ''))) {
    const n = a.replace(/,/g, '');
    const [w, f = '00'] = n.split('.');
    return `$${w}.${f.padEnd(2, '0').slice(0, 2)}`;
  }
  return a;
}

export function receiptVars({
  amount,
  senderName,
  targetName,
  createdAt,
  receiptId,
  description,
  phone,
}) {
  const desc =
    description && String(description).trim()
      ? String(description).trim()
      : 'Goods';
  const ph = phone && String(phone).trim() ? String(phone).trim() : '';
  const target = targetName && String(targetName).trim() ? String(targetName).trim() : '';
  const from = senderName && String(senderName).trim() ? String(senderName).trim() : '';
  return {
    amount: escapeHtml(displayAmount(amount)),
    senderName: escapeHtml(from),
    targetName: escapeHtml(target),
    when: escapeHtml(formatWhenAest(createdAt)),
    receiptId: escapeHtml(receiptId),
    description: escapeHtml(desc),
    phone: escapeHtml(ph),
    hasPhone: Boolean(ph),
    amountRaw: displayAmount(amount),
    senderNameRaw: from,
    targetNameRaw: target,
    whenRaw: formatWhenAest(createdAt),
    receiptIdRaw: String(receiptId ?? ''),
    descriptionRaw: desc,
    phoneRaw: ph,
  };
}
