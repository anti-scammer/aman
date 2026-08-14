/**
 * Sender / caller checker (PROJECT_PLAN.md §4.2c).
 *
 * Classifies the checked value as a PHONE number or an alphanumeric
 * SENDER_ID, then resolves trust:
 *   - official  → curated registry of Palestinian institutions (verdict safe)
 *   - reported  → matching APPROVED PHONE reports (verdict dangerous)
 *   - unknown   → neither (score 0, verdict safe, UNKNOWN_SENDER reason)
 *
 * `heuristicCheckSender` is pure (registry + classification only) and is
 * what the pure message analyzer uses. `checkSender` adds the DB lookup.
 */
import { normalizePhone } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import { Reason, Verdict } from './urlChecker';

export type SenderType = 'PHONE' | 'SENDER_ID';
export type SenderTrust = 'official' | 'reported' | 'unknown';

export interface SenderResult {
  value: string;
  normalizedValue: string;
  type: SenderType;
  trust: SenderTrust;
  verdict: Verdict;
  score: number;
  communityReports: number;
  reasons: Reason[];
}

/**
 * Curated registry of official Palestinian sender IDs (telecoms, banks,
 * wallets). Matched case-insensitively on the trimmed value.
 */
export const OFFICIAL_SENDER_REGISTRY = new Set(
  [
    // Telecom
    'JAWWAL',
    'OOREDOO',
    'PALTEL',
    'HADARA',
    // Banks
    'BOP',
    'BANK OF PALESTINE',
    'ARAB BANK',
    'QUDS BANK',
    'BANK OF JORDAN',
    'CAIRO AMMAN BANK',
    'TNB',
    'THE NATIONAL BANK',
    'PIB',
    'PALESTINE ISLAMIC BANK',
    'SAFA BANK',
    // Wallets / payments
    'PALPAY',
    'JAWWALPAY',
    'JAWWAL PAY',
    'REFLECT',
    'MAALCHAT',
    // Government / emergency
    'PAL GOV',
    'MOH',
    'MOI',
  ].map((s) => s.toLowerCase())
);

/** Does the value normalize to a plausible phone number? */
export function classifySenderType(value: string): { type: SenderType; normalizedValue: string } {
  const normalized = normalizePhone(value);
  // Plausible phone: optional +, then 7–15 digits, and the raw value is
  // digits/phone punctuation only (no letters).
  const phoneLike = /^\+?\d{7,15}$/.test(normalized) && /^[+\d\s\-().]+$/.test(value.trim());
  if (phoneLike) return { type: 'PHONE', normalizedValue: normalized };
  return { type: 'SENDER_ID', normalizedValue: value.trim().toLowerCase() };
}

/** Pure part: classification + official registry. Never returns `reported`. */
export function heuristicCheckSender(value: string): SenderResult {
  const { type, normalizedValue } = classifySenderType(value);

  if (type === 'SENDER_ID' && OFFICIAL_SENDER_REGISTRY.has(normalizedValue)) {
    return {
      value: value.trim(),
      normalizedValue,
      type,
      trust: 'official',
      verdict: 'safe',
      score: 0,
      communityReports: 0,
      reasons: [
        {
          code: 'OFFICIAL_SENDER',
          message: 'المرسل مدرج في سجل الجهات الرسمية الفلسطينية (شركات اتصالات، بنوك، محافظ)',
          messageEn: 'Sender is in the registry of official Palestinian institutions (telecoms, banks, wallets)',
        },
      ],
    };
  }

  return {
    value: value.trim(),
    normalizedValue,
    type,
    trust: 'unknown',
    verdict: 'safe',
    score: 0,
    communityReports: 0,
    reasons: [
      {
        code: 'UNKNOWN_SENDER',
        message: 'المرسل غير معروف — ليس في سجل الجهات الرسمية ولا في بلاغات المجتمع، تعامل معه بحذر طبيعي',
        messageEn: 'Unknown sender — not in the official registry and not reported by the community; treat with normal caution',
      },
    ],
  };
}

/** Full sender check: registry + APPROVED PHONE report matching. */
export async function checkSender(value: string): Promise<SenderResult> {
  const base = heuristicCheckSender(value);
  if (base.trust === 'official') return base;

  // Community blocklist: matching APPROVED PHONE reports (normalized values)
  const communityReports = await prisma.report.count({
    where: { type: 'PHONE', status: 'APPROVED', normalizedValue: base.normalizedValue },
  });

  if (communityReports > 0) {
    return {
      ...base,
      trust: 'reported',
      verdict: 'dangerous',
      score: Math.min(100, 50 + communityReports * 10),
      communityReports,
      reasons: [
        {
          code: 'REPORTED_SENDER',
          message: `تم الإبلاغ عن هذا الرقم/المرسل ${communityReports} مرة من قبل المجتمع كاحتيال`,
          messageEn: `This number/sender was reported ${communityReports} time(s) by the community as a scam`,
        },
      ],
    };
  }

  return base;
}
