/**
 * Palestinian brands commonly impersonated by scammers, shared between the
 * URL checker (domain lookalikes) and the social-account checker (handle
 * impersonation). Extracted from urlChecker so the logic isn't duplicated.
 */
import { levenshtein } from './levenshtein';

/** Palestinian brands commonly impersonated by phishers. */
export const PROTECTED_BRANDS = [
  'jawwalpay',
  'jawwal',
  'ooredoo',
  'paltel',
  'bankofpalestine',
  'palpay',
  'reflect',
  'bop',
];

export const BRAND_LABEL_AR: Record<string, string> = {
  jawwal: 'جوال',
  jawwalpay: 'جوال باي',
  ooredoo: 'أوريدو',
  paltel: 'بالتل',
  bankofpalestine: 'بنك فلسطين',
  palpay: 'بال باي',
  reflect: 'ريفلكت',
  bop: 'بنك فلسطين (BoP)',
};

/** Official domains — never flagged as lookalikes. */
export const OFFICIAL_DOMAINS = new Set([
  'jawwal.ps',
  'jawwal.com',
  'ooredoo.ps',
  'ooredoo.com',
  'paltel.ps',
  'paltel.net',
  'bankofpalestine.com',
  'bop.ps',
  'palpay.ps',
  'palpay.com',
  'jawwalpay.ps',
  'reflect.ps',
]);

/**
 * Does `label` (a domain label or a social-handle token) impersonate one of
 * the protected brands? Substring match or a small Levenshtein distance
 * (1 for short brands, 2 otherwise), also tried with separators/digits
 * stripped (catches `jawwa1`, `jaw-wal`, `jawwal2026`).
 * Returns the matched brand or null.
 */
export function matchBrandImpersonation(label: string): string | null {
  const lower = label.toLowerCase();
  const labelNoSep = lower.replace(/[-_.0-9]/g, '');
  for (const brand of PROTECTED_BRANDS) {
    const matched =
      lower.includes(brand) ||
      levenshtein(lower, brand) <= (brand.length <= 4 ? 1 : 2) ||
      (labelNoSep !== lower && labelNoSep.length > 0 && levenshtein(labelNoSep, brand) <= 1);
    if (matched) return brand;
  }
  return null;
}
