/**
 * Social account checker (PROJECT_PLAN.md §4.2b).
 *
 * Accepts a profile URL (facebook.com/…, instagram.com/…, tiktok.com/@…,
 * t.me/…, x.com/…, wa.me/…) or a bare @handle, detects the platform,
 * extracts the handle, and scores weighted impersonation signals.
 *
 * `heuristicCheckSocial` is pure (unit-testable). `checkSocial` adds the DB
 * signals (APPROVED SOCIAL_ACCOUNT reports + check frequency) and logs the
 * check to CheckLog with kind "SOCIAL".
 */
import { BRAND_LABEL_AR, matchBrandImpersonation } from '../lib/brands';
import { normalizeSocialAccount, normalizeUrl } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import { Reason, Verdict, verdictForScore } from './urlChecker';

export type SocialPlatform =
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'TELEGRAM'
  | 'X'
  | 'WHATSAPP'
  | 'UNKNOWN';

export interface ParsedSocialInput {
  platform: SocialPlatform;
  handle: string;
  /** Canonical key used for CheckLog frequency counting. */
  normalizedValue: string;
}

export interface HeuristicSocialResult extends ParsedSocialInput {
  input: string;
  score: number;
  verdict: Verdict;
  reasons: Reason[];
}

export interface CheckSocialResult extends HeuristicSocialResult {
  communityReports: number;
}

/** hostname (without www./m.) → platform */
const PLATFORM_HOSTS: Record<string, SocialPlatform> = {
  'facebook.com': 'FACEBOOK',
  'fb.com': 'FACEBOOK',
  'fb.me': 'FACEBOOK',
  'instagram.com': 'INSTAGRAM',
  'instagr.am': 'INSTAGRAM',
  'tiktok.com': 'TIKTOK',
  't.me': 'TELEGRAM',
  'telegram.me': 'TELEGRAM',
  'telegram.org': 'TELEGRAM',
  'x.com': 'X',
  'twitter.com': 'X',
  'wa.me': 'WHATSAPP',
  'whatsapp.com': 'WHATSAPP',
  'api.whatsapp.com': 'WHATSAPP',
  'chat.whatsapp.com': 'WHATSAPP',
};

/** Scam keywords commonly planted inside fake-account handles. */
const HANDLE_SCAM_KEYWORDS = [
  'prize', 'prizes', 'win', 'winner', 'won', 'gift', 'gifts', 'free',
  'bonus', 'reward', 'rewards', 'giveaway', 'lottery', 'promo', 'offer',
  'offers', 'official', 'agent', 'support', 'vip',
  'وكيل', 'جائزة', 'جوائز', 'هدية', 'هدايا', 'ربح', 'سحب', 'رسمي', 'عروض',
];

/**
 * Parse a profile URL or bare @handle into { platform, handle }.
 * Path prefixes that are not handles (share pages, groups) keep the next
 * meaningful segment where possible.
 */
export function parseSocialInput(rawInput: string): ParsedSocialInput {
  const input = rawInput.trim();

  // Bare @handle (or plain handle without any URL structure)
  const looksLikeUrl = /[/\\]/.test(input) || /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  if (!looksLikeUrl) {
    const handle = normalizeSocialAccount(input);
    return { platform: 'UNKNOWN', handle, normalizedValue: handle };
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  let parsed: URL | null = null;
  try {
    parsed = new URL(withScheme);
  } catch {
    const handle = normalizeSocialAccount(input);
    return { platform: 'UNKNOWN', handle, normalizedValue: handle };
  }

  const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.|web\.|mobile\.)/, '');
  const platform = PLATFORM_HOSTS[host] ?? 'UNKNOWN';
  const segments = parsed.pathname.split('/').filter(Boolean);

  // Skip common non-handle path prefixes (facebook.com/profile.php?id=…,
  // facebook.com/people/Name/123, instagram.com/p/…, tiktok.com/@user)
  let handle = segments[0] ?? '';
  if (platform === 'FACEBOOK' && handle === 'people' && segments[1]) handle = segments[1];
  if (platform === 'FACEBOOK' && handle === 'profile.php') {
    handle = parsed.searchParams.get('id') ?? handle;
  }
  handle = normalizeSocialAccount(decodeURIComponent(handle));

  const normalizedValue =
    platform === 'UNKNOWN' ? normalizeUrl(input) : `${platform.toLowerCase()}:${handle}`;
  return { platform, handle, normalizedValue };
}

/** Pure heuristic analysis of a social profile URL / handle. */
export function heuristicCheckSocial(rawInput: string): HeuristicSocialResult {
  const parsed = parseSocialInput(rawInput);
  const { handle } = parsed;
  const reasons: Reason[] = [];
  let score = 0;
  const add = (points: number, code: string, message: string, messageEn: string) => {
    score += points;
    reasons.push({ code, message, messageEn });
  };

  // 1) Brand impersonation in the handle (shared brand list + Levenshtein).
  //    A handle that is *exactly* the brand name could be the official page,
  //    so only extra-decorated handles (jawwal.prizes2026, jawwal-official…)
  //    are flagged.
  const brand = matchBrandImpersonation(handle);
  if (brand && handle !== brand) {
    add(
      40,
      'BRAND_IMPERSONATION',
      `اسم الحساب ينتحل علامة تجارية فلسطينية (${BRAND_LABEL_AR[brand] ?? brand}) — الحسابات الرسمية موثقة ولا تحمل إضافات`,
      `Handle impersonates a Palestinian brand (${brand}) — official accounts are verified and undecorated`
    );
  }

  // 2) Scam keywords planted in the handle (prize / official / agent / وكيل…)
  const handleTokens = handle.split(/[._\-/]+/).filter(Boolean);
  const hitKeywords = HANDLE_SCAM_KEYWORDS.filter(
    (k) => handleTokens.some((t) => t.replace(/\d+$/, '') === k) || handle.includes(k)
  );
  if (hitKeywords.length > 0) {
    add(
      25,
      'HANDLE_SCAM_KEYWORDS',
      `اسم الحساب يحتوي كلمات شائعة في الحسابات الاحتيالية (${hitKeywords.slice(0, 3).join('، ')})`,
      `Handle contains keywords common in scam accounts (${hitKeywords.slice(0, 3).join(', ')})`
    );
  }

  // 3) Digit-suffix impersonation pattern (jawwal.prizes2026, bop_support12)
  if (/\d{2,}$/.test(handle)) {
    add(
      15,
      'DIGIT_SUFFIX',
      'اسم الحساب ينتهي بأرقام — نمط شائع للحسابات المقلدة المنشأة حديثًا',
      'Handle ends with a digit suffix — a common pattern of freshly created copycat accounts'
    );
  }

  score = Math.min(100, score);
  return { input: rawInput.trim(), ...parsed, score, verdict: verdictForScore(score), reasons };
}

/**
 * Full social check: heuristics + community-report signal + check-frequency
 * signal. Logs the check to CheckLog with kind "SOCIAL" (unless `log` is false).
 */
export async function checkSocial(
  rawInput: string,
  opts: { log?: boolean } = {}
): Promise<CheckSocialResult> {
  const base = heuristicCheckSocial(rawInput);
  let score = base.score;
  const reasons = [...base.reasons];

  // Matching APPROVED SOCIAL_ACCOUNT reports. Reports may be stored as a
  // bare handle (@handle → "handle") or as a profile URL, so match every
  // normalization of the input.
  const candidates = [
    ...new Set(
      [normalizeSocialAccount(rawInput), normalizeUrl(rawInput), base.handle].filter(Boolean)
    ),
  ];
  const communityReports = await prisma.report.count({
    where: { type: 'SOCIAL_ACCOUNT', status: 'APPROVED', normalizedValue: { in: candidates } },
  });
  if (communityReports > 0) {
    score += Math.min(45, 25 + (communityReports - 1) * 10);
    reasons.push({
      code: 'COMMUNITY_REPORTS',
      message: `تم الإبلاغ عن هذا الحساب ${communityReports} مرة من قبل المجتمع كاحتيال`,
      messageEn: `This account was reported ${communityReports} time(s) by the community as a scam`,
    });
  }

  // Check-frequency signal: same account checked often recently
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentChecks = await prisma.checkLog.count({
    where: { kind: 'SOCIAL', normalizedValue: base.normalizedValue, createdAt: { gte: since } },
  });
  if (recentChecks >= 5) {
    score += 10;
    reasons.push({
      code: 'FREQUENTLY_CHECKED',
      message: 'يتم فحص هذا الحساب بكثرة مؤخرًا — مؤشر على حملة احتيال نشطة',
      messageEn: 'This account is being checked unusually often — sign of an active scam campaign',
    });
  }

  score = Math.min(100, score);
  const verdict = verdictForScore(score);

  if (opts.log !== false) {
    await prisma.checkLog.create({
      data: { kind: 'SOCIAL', normalizedValue: base.normalizedValue, verdict, score },
    });
  }

  return { ...base, score, verdict, reasons, communityReports };
}
