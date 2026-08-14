/**
 * URL heuristic engine (PROJECT_PLAN.md §3, §4.1).
 *
 * `heuristicCheckUrl` is a pure, synchronous rule engine (unit-testable).
 * `checkUrl` wraps it with the DB signals (community reports + check
 * frequency) and logs the check to CheckLog.
 */
import { BRAND_LABEL_AR, matchBrandImpersonation, OFFICIAL_DOMAINS } from '../lib/brands';
import { normalizeUrl } from '../lib/normalize';
import { prisma } from '../lib/prisma';

export type Verdict = 'safe' | 'suspicious' | 'dangerous';

export interface Reason {
  code: string;
  message: string; // Arabic
  messageEn: string;
}

export interface HeuristicResult {
  url: string;
  normalizedValue: string;
  score: number;
  verdict: Verdict;
  reasons: Reason[];
}

export interface CheckUrlResult extends HeuristicResult {
  communityReports: number;
}

export function verdictForScore(score: number): Verdict {
  if (score >= 60) return 'dangerous';
  if (score >= 30) return 'suspicious';
  return 'safe';
}

const SUSPICIOUS_TLDS = new Set([
  'win', 'top', 'xyz', 'club', 'icu', 'live', 'link', 'buzz', 'click',
  'work', 'loan', 'money', 'gq', 'tk', 'ml', 'cf', 'ga', 'rest', 'bar',
  'cam', 'monster', 'quest', 'cyou', 'sbs',
]);

const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 'cutt.ly', 'is.gd', 't.co', 'goo.gl',
  'rebrand.ly', 'shorturl.at', 'rb.gy', 'tiny.cc', 's.id', 'ow.ly',
  'buff.ly', 'v.gd', 'lnkd.in', 'shrtco.de', 'urlz.fr',
]);

const SCAM_KEYWORDS = [
  'prize', 'win', 'winner', 'won', 'gift', 'free', 'bonus', 'reward',
  'claim', 'lottery', 'promo', 'lucky',
  'هدية', 'جائزة', 'ربح', 'مجانا', 'مجاني', 'مكافأة',
];

/** Multi-part public suffixes we care about locally (e.g. jawwal.com.ps). */
const MULTIPART_SUFFIXES = new Set([
  'com.ps', 'net.ps', 'org.ps', 'edu.ps', 'gov.ps',
  'co.uk', 'org.uk', 'com.jo', 'co.il',
]);

/** Extract the registrable domain (eTLD+1-ish) from a hostname. */
export function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  if (MULTIPART_SUFFIXES.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}

function isIpLiteral(hostname: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true; // IPv4
  return hostname.startsWith('[') || /^[0-9a-f:]+:[0-9a-f:]+$/i.test(hostname); // IPv6
}

/** Pure heuristic analysis of a single URL. */
export function heuristicCheckUrl(rawUrl: string): HeuristicResult {
  const reasons: Reason[] = [];
  let score = 0;
  const add = (points: number, code: string, message: string, messageEn: string) => {
    score += points;
    reasons.push({ code, message, messageEn });
  };

  const trimmed = rawUrl.trim();
  const hadScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  const withScheme = hadScheme ? trimmed : `http://${trimmed}`;

  let parsed: URL | null = null;
  try {
    parsed = new URL(withScheme);
  } catch {
    return {
      url: rawUrl,
      normalizedValue: normalizeUrl(rawUrl),
      score: 50,
      verdict: 'suspicious',
      reasons: [{
        code: 'UNPARSEABLE_URL',
        message: 'تعذر تحليل الرابط — قد يكون مشوهًا عمدًا',
        messageEn: 'The URL could not be parsed — it may be deliberately malformed',
      }],
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const regDomain = registrableDomain(hostname);
  const domainLabel = regDomain.split('.')[0] ?? '';
  const tld = hostname.split('.').pop() ?? '';
  const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
  const isOfficial =
    OFFICIAL_DOMAINS.has(regDomain) ||
    [...OFFICIAL_DOMAINS].some((d) => hostname === d || hostname.endsWith(`.${d}`));

  // 1) Brand lookalike (substring + Levenshtein on the registrable domain)
  if (!isOfficial) {
    const brand = matchBrandImpersonation(domainLabel);
    if (brand) {
      add(
        45,
        'BRAND_LOOKALIKE',
        `يشبه اسم علامة تجارية فلسطينية (${BRAND_LABEL_AR[brand] ?? brand}) وليس النطاق الرسمي`,
        `Resembles a Palestinian brand (${brand}) but is not the official domain`
      );
    }
  }

  // 2) Punycode / IDN homograph
  if (hostname.split('.').some((l) => l.startsWith('xn--'))) {
    add(
      30,
      'PUNYCODE_DOMAIN',
      'يستخدم النطاق ترميز Punycode — قد يخفي أحرفًا مشابهة لخداعك',
      'Domain uses punycode (IDN) — may hide lookalike characters'
    );
  }

  // 3) IP-literal host
  if (isIpLiteral(hostname)) {
    add(
      30,
      'IP_LITERAL',
      'الرابط يستخدم عنوان IP بدلًا من اسم نطاق — المواقع الموثوقة لا تفعل ذلك عادة',
      'URL uses a raw IP address instead of a domain name'
    );
  }

  // 4) Suspicious TLD
  if (SUSPICIOUS_TLDS.has(tld)) {
    add(
      20,
      'SUSPICIOUS_TLD',
      `امتداد النطاق ".${tld}" شائع الاستخدام في حملات الاحتيال`,
      `The ".${tld}" TLD is frequently used in scam campaigns`
    );
  }

  // 5) URL shortener
  if (URL_SHORTENERS.has(regDomain) || URL_SHORTENERS.has(hostname)) {
    add(
      35,
      'URL_SHORTENER',
      'رابط مختصر يخفي الوجهة الحقيقية — لا يمكن التحقق من الموقع النهائي',
      'Shortened link hides the real destination'
    );
  }

  // 6) No HTTPS
  if (parsed.protocol === 'http:' && hadScheme) {
    add(
      15,
      'NO_HTTPS',
      'الرابط لا يستخدم اتصالًا مشفرًا (HTTPS)',
      'The link does not use an encrypted HTTPS connection'
    );
  }

  // 7) Excessive subdomains (e.g. login.bankofpalestine.com.secure-verify.top)
  if (!isIpLiteral(hostname) && hostname.split('.').length - regDomain.split('.').length >= 3) {
    add(
      15,
      'EXCESSIVE_SUBDOMAINS',
      'عدد غير اعتيادي من النطاقات الفرعية — أسلوب شائع لتمويه الرابط',
      'Unusual number of subdomains — a common cloaking technique'
    );
  }

  // 8) Scam keywords in domain or path
  const kwHaystack = `${hostname} ${decodeURIComponent(pathAndQuery)}`;
  const hitKeywords = SCAM_KEYWORDS.filter((k) => kwHaystack.includes(k));
  if (hitKeywords.length > 0) {
    add(
      20,
      'SCAM_KEYWORDS',
      `يحتوي الرابط على كلمات احتيالية شائعة (${hitKeywords.slice(0, 3).join('، ')})`,
      `Contains common scam keywords (${hitKeywords.slice(0, 3).join(', ')})`
    );
  }

  // 9) "@" in URL (credentials trick: https://bank.com@evil.site)
  if (withScheme.replace(/^[^:]+:\/\//, '').split('/')[0].includes('@')) {
    add(
      25,
      'AT_IN_URL',
      'يحتوي الرابط على الرمز @ — خدعة لإخفاء الموقع الحقيقي',
      'URL contains "@" — a trick to disguise the real destination'
    );
  }

  // 10) Very long URL
  if (trimmed.length > 100) {
    add(
      10,
      'VERY_LONG_URL',
      'رابط طويل بشكل غير اعتيادي — يُستخدم أحيانًا لإخفاء الجزء المهم',
      'Unusually long URL — sometimes used to hide the important part'
    );
  }

  score = Math.min(100, score);
  return {
    url: rawUrl,
    normalizedValue: normalizeUrl(rawUrl),
    score,
    verdict: verdictForScore(score),
    reasons,
  };
}

/**
 * Full URL check: heuristics + community-report signal + check-frequency
 * signal. Logs the check to CheckLog (unless `log` is false).
 */
export async function checkUrl(rawUrl: string, opts: { log?: boolean } = {}): Promise<CheckUrlResult> {
  const base = heuristicCheckUrl(rawUrl);
  let score = base.score;
  const reasons = [...base.reasons];

  // Community blocklist: matching APPROVED URL reports
  const communityReports = await prisma.report.count({
    where: { type: 'URL', status: 'APPROVED', normalizedValue: base.normalizedValue },
  });
  if (communityReports > 0) {
    score += Math.min(45, 25 + (communityReports - 1) * 10);
    reasons.push({
      code: 'COMMUNITY_REPORTS',
      message: `تم الإبلاغ عن هذا الرابط ${communityReports} مرة من قبل المجتمع كاحتيال`,
      messageEn: `This URL was reported ${communityReports} time(s) by the community as a scam`,
    });
  }

  // Check-frequency signal: same normalizedValue checked often recently
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentChecks = await prisma.checkLog.count({
    where: { kind: 'URL', normalizedValue: base.normalizedValue, createdAt: { gte: since } },
  });
  if (recentChecks >= 5) {
    score += 10;
    reasons.push({
      code: 'FREQUENTLY_CHECKED',
      message: 'يتم فحص هذا الرابط بكثرة مؤخرًا — مؤشر على حملة احتيال نشطة',
      messageEn: 'This URL is being checked unusually often — sign of an active scam campaign',
    });
  }

  score = Math.min(100, score);
  const verdict = verdictForScore(score);

  if (opts.log !== false) {
    await prisma.checkLog.create({
      data: { kind: 'URL', normalizedValue: base.normalizedValue, verdict, score },
    });
  }

  return { ...base, score, verdict, reasons, communityReports };
}
