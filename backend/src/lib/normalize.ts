/**
 * Normalization helpers so that the same phone number / URL / account
 * written in different ways matches the same `normalizedValue` in the DB.
 */

/**
 * Normalize a Palestinian phone number to a canonical `+970XXXXXXXXX` form.
 *
 * Handles: spaces, dashes, dots, parentheses, and the prefixes
 * `+970`, `00970`, `970`, `+972`, `00972`, `972` and a local leading `0`.
 * Examples (all → `+970599123456`):
 *   "+970 599-123-456", "00970599123456", "0599123456", "970599123456"
 */
export function normalizePhone(raw: string): string {
  let s = raw.trim().replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);

  // Palestinian numbers reach the network via either +970 or +972 (Israeli
  // carrier routing); collapse both to a single +970 canonical form so a
  // reported number matches whichever country code a call/SMS presents.
  if (s.startsWith('+970')) return '+970' + s.slice(4).replace(/^0+/, '');
  if (s.startsWith('+972')) return '+970' + s.slice(4).replace(/^0+/, '');
  if (s.startsWith('970')) return '+970' + s.slice(3).replace(/^0+/, '');
  if (s.startsWith('972')) return '+970' + s.slice(3).replace(/^0+/, '');
  // Local format 05xxxxxxxx / 0x... → assume Palestinian +970
  if (s.startsWith('0')) return '+970' + s.replace(/^0+/, '');
  return s;
}

/**
 * Normalize a URL for matching: lowercase host, drop the scheme and any
 * `www.` prefix, strip trailing slash. `bit.ly/xy`, `https://bit.ly/xy/`
 * and `HTTPS://BIT.LY/xy` all normalize to `bit.ly/xy`.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '');
    const search = u.search || '';
    return `${host}${path}${search}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

/** Normalize a social account handle: lowercase, strip a leading @. */
export function normalizeSocialAccount(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, '');
}

export type ReportType = 'PHONE' | 'URL' | 'SOCIAL_ACCOUNT';

export function normalizeReportValue(type: ReportType, value: string): string {
  switch (type) {
    case 'PHONE':
      return normalizePhone(value);
    case 'URL':
      return normalizeUrl(value);
    case 'SOCIAL_ACCOUNT':
      return normalizeSocialAccount(value);
  }
}
