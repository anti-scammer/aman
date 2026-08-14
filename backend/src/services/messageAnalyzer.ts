/**
 * Message analyzer (PROJECT_PLAN.md §3, §4.2).
 *
 * A weighted rule engine over Arabic + English scam patterns, grouped by
 * scam category (§6). URLs found in the text are run through the URL
 * checker and their results are folded into the final score/reasons.
 *
 * `analyzeMessageText` is pure (uses only URL heuristics) — unit-testable.
 * `analyzeMessage` adds DB signals for extracted URLs and logs to CheckLog.
 */
import { normalizeUrl } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import { isLlmAvailable, llmClassifyMessage, llmModel, LlmVerdict } from './llmAnalyzer';
import { checkSender, heuristicCheckSender, SenderResult } from './senderChecker';
import {
  checkUrl,
  heuristicCheckUrl,
  Reason,
  Verdict,
  verdictForScore,
} from './urlChecker';

export type ScamCategory =
  | 'PRIZE_SCAM'
  | 'DELIVERY_SCAM'
  | 'JOB_SCAM'
  | 'BANK_PHISHING'
  | 'OTP_THEFT'
  | 'FAKE_SHOP'
  | 'CHARITY_SCAM'
  | 'CRYPTO_SCAM'
  | 'OTHER';

export interface LlmSignal {
  used: true;
  model: string;
  isScam: boolean;
  confidence: number;
}

export interface AnalyzeResult {
  verdict: Verdict;
  score: number;
  categories: ScamCategory[];
  reasons: Reason[];
  extractedUrls: string[];
  /** Present only when a `sender` was provided (§4.2c). */
  sender?: SenderResult;
  /** Present only when the local LLM second opinion was consulted. */
  llm?: LlmSignal;
}

interface Pattern {
  category: ScamCategory | null; // null = generic signal (e.g. urgency)
  weight: number;
  regex: RegExp;
  code: string;
  message: string; // Arabic explanation
  messageEn: string;
}

/** Weighted Arabic + English scam patterns. */
const PATTERNS: Pattern[] = [
  // ---- PRIZE_SCAM ----------------------------------------------------
  {
    category: 'PRIZE_SCAM',
    weight: 30,
    regex: /مبروك|مبارك|تهانينا|congratulations|congrats/i,
    code: 'PRIZE_CONGRATS',
    message: 'رسالة تهنئة غير متوقعة — بداية نموذجية لاحتيال الجوائز',
    messageEn: 'Unexpected congratulation — a classic prize-scam opener',
  },
  {
    category: 'PRIZE_SCAM',
    weight: 30,
    regex: /ربحت|ربحتم|فزت|فزتم|جائزة|جوائز|سحب|يانصيب|you (?:have )?won|winner|prize|lottery|lucky draw/i,
    code: 'PRIZE_CLAIM',
    message: 'ادعاء بفوزك بجائزة أو سحب لم تشارك فيه',
    messageEn: 'Claims you won a prize or a draw you never entered',
  },
  // ---- DELIVERY_SCAM -------------------------------------------------
  {
    category: 'DELIVERY_SCAM',
    weight: 30,
    regex: /رسوم\s*(?:ال)?توصيل|رسوم\s*(?:ال)?شحن|رسوم\s*(?:ال)?جمرك|delivery fee|shipping fee|customs fee/i,
    code: 'DELIVERY_FEE',
    message: 'طلب دفع رسوم توصيل/شحن — أسلوب شائع لاحتيال الطرود',
    messageEn: 'Asks to pay a delivery/shipping fee — a common parcel-scam trick',
  },
  {
    category: 'DELIVERY_SCAM',
    weight: 20,
    regex: /طرد|شحنة|ساعي|بانتظار التسليم|parcel|package|shipment|courier|(?:is|are) waiting for delivery/i,
    code: 'DELIVERY_PARCEL',
    message: 'رسالة عن طرد أو شحنة معلّقة لم تطلبها',
    messageEn: 'Mentions a pending parcel/shipment you did not order',
  },
  // ---- JOB_SCAM ------------------------------------------------------
  {
    category: 'JOB_SCAM',
    weight: 25,
    regex: /وظيفة|فرصة عمل|عمل من المنزل|راتب|دوام جزئي|job offer|work from home|part[- ]time|earn .*(?:daily|per day)|hiring/i,
    code: 'JOB_OFFER',
    message: 'عرض عمل غير مطلوب — احتيال التوظيف يبدأ عادة برسالة مماثلة',
    messageEn: 'Unsolicited job offer — recruitment scams typically start this way',
  },
  {
    category: 'JOB_SCAM',
    weight: 25,
    regex: /راتب\s*(?:يومي|أسبوعي|مغر|خيالي)|بدون خبرة|no experience (?:needed|required)|\$\d+\s*(?:per|\/)\s*(?:day|hour)|easy money/i,
    code: 'JOB_TOO_GOOD',
    message: 'وعود براتب مغرٍ دون خبرة — عرض أفضل من أن يكون حقيقيًا',
    messageEn: 'Promises high pay with no experience — too good to be true',
  },
  // ---- BANK_PHISHING -------------------------------------------------
  {
    category: 'BANK_PHISHING',
    weight: 30,
    regex: /حسابك\s*(?:البنكي)?\s*(?:سيتم|تم)?\s*(?:إيقاف|ايقاف|تجميد|إغلاق|اغلاق)|تحديث\s*(?:بيانات|معلومات)|account (?:will be )?(?:suspended|blocked|frozen|closed)|verify your account|update your (?:bank )?(?:details|information)/i,
    code: 'BANK_ACCOUNT_THREAT',
    message: 'تهديد بإيقاف الحساب أو طلب "تحديث بيانات" — تصيّد مصرفي نموذجي',
    messageEn: 'Threatens account suspension or asks to "update details" — classic bank phishing',
  },
  {
    category: 'BANK_PHISHING',
    weight: 30,
    regex: /بنك فلسطين|البنك العربي|بنك القدس|بنك الاستثمار|جوال باي|بال باي|محفظت?ك|bank of palestine|palpay|jawwal pay|reflect|your (?:bank|wallet)/i,
    code: 'BANK_IMPERSONATION',
    message: 'انتحال صفة بنك أو محفظة إلكترونية فلسطينية',
    messageEn: 'Impersonates a Palestinian bank or e-wallet',
  },
  {
    category: 'BANK_PHISHING',
    weight: 30,
    regex: /كلمة\s*(?:ال)?سر|كلمة\s*(?:ال)?مرور|رقم\s*(?:ال)?بطاقة|CVV|رمز\s*(?:ال)?سري|password|card number|pin code/i,
    code: 'CREDENTIALS_REQUEST',
    message: 'طلب كلمة سر أو بيانات بطاقة — لا جهة رسمية تطلب ذلك أبدًا',
    messageEn: 'Asks for a password or card details — no legitimate party ever does',
  },
  {
    category: 'BANK_PHISHING',
    weight: 25,
    regex: /حول\s*(?:لي)?\s*مبلغ|حوّل|تحويل\s*(?:مبلغ|فوري|مالي)|ادفع|أرسل\s*(?:المبلغ|المال|مبلغ)|transfer (?:the )?(?:money|amount|funds)|send (?:the )?(?:money|payment)|pay (?:now|the fee)/i,
    code: 'PAYMENT_REQUEST',
    message: 'طلب تحويل أموال أو دفع مبلغ مقدمًا',
    messageEn: 'Requests a money transfer or upfront payment',
  },
  // ---- OTP_THEFT -----------------------------------------------------
  {
    category: 'OTP_THEFT',
    weight: 40,
    regex: /رمز\s*(?:ال)?تحقق|رمز\s*(?:ال)?تأكيد|كود\s*(?:ال)?تفعيل|الرمز\s*(?:الذي|اللي)\s*وصلك?|أرسل\s*(?:لي)?\s*الرمز|OTP|one[- ]time (?:password|code)|verification code|(?:send|share|give)\s*(?:me|us)?\s*the code/i,
    code: 'OTP_REQUEST',
    message: 'طلب رمز التحقق (OTP) — الرمز سري ولا يُشارك مع أي شخص إطلاقًا',
    messageEn: 'Asks for the OTP/verification code — never share it with anyone',
  },
  // ---- FAKE_SHOP -----------------------------------------------------
  {
    category: 'FAKE_SHOP',
    weight: 20,
    regex: /خصم\s*(?:يصل|حتى)?\s*\d{2,}\s*%|تصفية|عرض\s*(?:محدود|خاص|حصري)|آخر\s*قطعة|discount\s*\d{2,}\s*%|clearance|limited offer|(?:70|80|90)% off/i,
    code: 'UNREAL_DISCOUNT',
    message: 'خصومات مبالغ فيها أو عروض "محدودة" — سمة المتاجر الوهمية',
    messageEn: 'Extreme discounts or "limited" offers — hallmark of fake shops',
  },
  {
    category: 'FAKE_SHOP',
    weight: 20,
    regex: /الدفع\s*(?:مقدما|مقدماً|مسبق|قبل الاستلام)|لا\s*(?:يوجد|نقبل)\s*دفع عند الاستلام|advance payment|pay before (?:delivery|shipping)|no cash on delivery/i,
    code: 'PREPAY_ONLY',
    message: 'إصرار على الدفع المسبق ورفض الدفع عند الاستلام',
    messageEn: 'Insists on prepayment and refuses cash on delivery',
  },
  // ---- CHARITY_SCAM --------------------------------------------------
  {
    category: 'CHARITY_SCAM',
    weight: 25,
    regex: /تبرع|تبرعوا|صدقة|زكاة|إغاثة|حالة\s*(?:إنسانية|مرضية|عاجلة)|كفالة\s*يتيم|donat(?:e|ion)|charity|humanitarian case|urgent case|sponsor an orphan/i,
    code: 'DONATION_REQUEST',
    message: 'طلب تبرعات من جهة غير موثقة — تحقق من الجمعية عبر قنواتها الرسمية',
    messageEn: 'Donation request from an unverified party — verify the charity officially',
  },
  // ---- CRYPTO_SCAM ---------------------------------------------------
  {
    category: 'CRYPTO_SCAM',
    weight: 25,
    regex: /بيتكوين|عملات\s*رقمية|تداول|استثمار\s*(?:مضمون|آمن)|أرباح\s*(?:مضمونة|يومية)|USDT|bitcoin|crypto|forex|guaranteed (?:profit|returns)|double your money|investment opportunity/i,
    code: 'CRYPTO_INVESTMENT',
    message: 'وعود أرباح مضمونة من تداول أو عملات رقمية — لا يوجد ربح مضمون',
    messageEn: 'Guaranteed-profit crypto/trading promises — no profit is ever guaranteed',
  },
  // ---- Generic signals (no category) ---------------------------------
  {
    category: null,
    weight: 15,
    regex: /عاجل|فورا|فوراً|حالا|حالاً|بسرعة|خلال\s*24\s*ساعة|قبل\s*(?:انتهاء|فوات)|urgent|immediately|act now|within 24 hours|expires? (?:today|soon)|last chance/i,
    code: 'URGENCY',
    message: 'أسلوب استعجال وضغط نفسي لدفعك للتصرف دون تفكير',
    messageEn: 'Urgency/pressure tactics to make you act without thinking',
  },
  {
    category: null,
    weight: 10,
    regex: /لا\s*تخبر\s*أحد|سري\s*(?:للغاية|جدا|جداً)|بيني وبينك|don'?t tell anyone|keep (?:this|it) (?:secret|confidential)/i,
    code: 'SECRECY',
    message: 'طلب السرية وعدم إخبار أحد — المحتالون يعزلون ضحاياهم',
    messageEn: 'Asks for secrecy — scammers isolate their victims',
  },
];

/** Categories need this much accumulated weight to be reported. */
const CATEGORY_THRESHOLD = 20;

const URL_REGEX =
  /(?:https?:\/\/[^\s<>"']+)|(?:\b(?:[a-z0-9-]+\.)+(?:com|net|org|ps|io|me|ly|gd|co|at|cc|gy|id|info|top|xyz|win|club|icu|live|link|buzz|click|site|online|shop|store|vip)\b(?:\/[^\s<>"']*)?)/gi;

/** Extract URL-looking strings from free text. */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const cleaned = m.replace(/[.,;:!?)\]]+$/, '');
    const key = normalizeUrl(cleaned);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cleaned);
    }
  }
  return out;
}

interface UrlSignal {
  url: string;
  verdict: Verdict;
  score: number;
  communityReports?: number;
}

function foldUrlSignals(signals: UrlSignal[], reasons: Reason[]): number {
  let extra = 0;
  for (const s of signals) {
    if (s.verdict === 'dangerous') {
      extra += 35;
      reasons.push({
        code: 'DANGEROUS_URL',
        message: `الرسالة تحتوي على رابط خطير: ${s.url}`,
        messageEn: `The message contains a dangerous link: ${s.url}`,
      });
    } else if (s.verdict === 'suspicious') {
      extra += 20;
      reasons.push({
        code: 'SUSPICIOUS_URL',
        message: `الرسالة تحتوي على رابط مشبوه: ${s.url}`,
        messageEn: `The message contains a suspicious link: ${s.url}`,
      });
    }
    if ((s.communityReports ?? 0) > 0) {
      extra += 15;
      reasons.push({
        code: 'URL_COMMUNITY_REPORTED',
        message: `الرابط ${s.url} سبق أن أبلغ عنه المجتمع كاحتيال`,
        messageEn: `The link ${s.url} was previously reported by the community`,
      });
    }
  }
  return extra;
}

function runPatterns(text: string) {
  const reasons: Reason[] = [];
  const categoryWeights = new Map<ScamCategory, number>();
  let score = 0;

  for (const p of PATTERNS) {
    if (p.regex.test(text)) {
      score += p.weight;
      reasons.push({ code: p.code, message: p.message, messageEn: p.messageEn });
      if (p.category) {
        categoryWeights.set(p.category, (categoryWeights.get(p.category) ?? 0) + p.weight);
      }
    }
  }

  const categories = [...categoryWeights.entries()]
    .filter(([, w]) => w >= CATEGORY_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  return { score, reasons, categories };
}

/** Message-level reason codes signalling OTP / credential requests. */
const CREDENTIAL_REASON_CODES = new Set(['OTP_REQUEST', 'CREDENTIALS_REQUEST']);

/**
 * Sender-aware scoring (§4.2c). Returns the score delta:
 *   - official → −25 with OFFICIAL_SENDER, unless the message asks for
 *     OTP/credentials or carries a dangerous URL — then no reduction and a
 *     SPOOFING_WARNING reason instead (sender IDs can be spoofed; real
 *     institutions never ask for codes).
 *   - reported → +40 with REPORTED_SENDER.
 *   - unknown  → 0 (no message-level reason).
 */
function foldSenderSignal(
  sender: SenderResult,
  reasons: Reason[],
  urlSignals: UrlSignal[]
): number {
  if (sender.trust === 'reported') {
    reasons.push({
      code: 'REPORTED_SENDER',
      message: `المرسل (${sender.value}) سبق أن أبلغ عنه المجتمع كمحتال`,
      messageEn: `The sender (${sender.value}) was previously reported by the community as a scammer`,
    });
    return 40;
  }

  if (sender.trust === 'official') {
    const asksForCredentials = reasons.some((r) => CREDENTIAL_REASON_CODES.has(r.code));
    const hasDangerousUrl = urlSignals.some((s) => s.verdict === 'dangerous');
    if (asksForCredentials || hasDangerousUrl) {
      reasons.push({
        code: 'SPOOFING_WARNING',
        message:
          'يبدو المرسل جهة رسمية لكن الرسالة تطلب رمزًا/بيانات سرية أو تحتوي رابطًا خطيرًا — معرّف المرسل قد يكون مزوّرًا، والجهات الرسمية لا تطلب الرموز أبدًا',
        messageEn:
          'Sender looks official but the message asks for codes/credentials or contains a dangerous link — sender IDs can be spoofed, and real institutions never ask for codes',
      });
      return 0; // skip the official-sender reduction
    }
    reasons.push({
      code: 'OFFICIAL_SENDER',
      message: `المرسل (${sender.value}) مدرج في سجل الجهات الرسمية — خُفّض تقييم الخطورة`,
      messageEn: `The sender (${sender.value}) is in the official registry — risk score reduced`,
    });
    return -25;
  }

  return 0;
}

const clampScore = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Fold the LLM second opinion into the rule score (rules-first hybrid).
 * The LLM shifts the score by at most ±25 (confidence-weighted) and can
 * never push a message the rules scored ≥60 below "suspicious": when
 * ruleScore ≥ 60 the new score is additionally clamped to ≥ 35.
 */
function foldLlmSignal(
  ruleScore: number,
  llm: LlmVerdict,
  categories: ScamCategory[],
  reasons: Reason[]
): number {
  const delta = Math.round((llm.isScam ? 1 : -1) * llm.confidence * 25);
  let score = clampScore(ruleScore + delta);
  if (ruleScore >= 60) score = Math.max(35, score); // guard: dangerous-by-rules stays ≥ suspicious

  if (llm.isScam && llm.category !== 'NONE' && !categories.includes(llm.category)) {
    categories.push(llm.category);
  }

  reasons.push({
    code: 'AI_ANALYSIS',
    message: `تحليل الذكاء الاصطناعي: ${llm.explanationAr || 'تم تحليل الرسالة بواسطة الذكاء الاصطناعي'}`,
    messageEn: `AI analysis: ${llm.explanationEn || 'the message was analyzed by a local AI model'}`,
  });

  return score;
}

/** Pure analysis (patterns + URL heuristics + offline sender registry). */
export function analyzeMessageText(text: string, senderValue?: string): AnalyzeResult {
  const { score: patternScore, reasons, categories } = runPatterns(text);
  const extractedUrls = extractUrls(text);
  const urlSignals = extractedUrls.map((u) => {
    const r = heuristicCheckUrl(u);
    return { url: u, verdict: r.verdict, score: r.score };
  });
  let score = patternScore + foldUrlSignals(urlSignals, reasons);

  // Offline sender check (registry only — cannot see community reports)
  let sender: SenderResult | undefined;
  if (senderValue !== undefined) {
    sender = heuristicCheckSender(senderValue);
    score += foldSenderSignal(sender, reasons, urlSignals);
  }

  score = clampScore(score);
  return { verdict: verdictForScore(score), score, categories, reasons, extractedUrls, sender };
}

/** Full analysis: patterns + full URL checks (DB signals) + CheckLog entry. */
export async function analyzeMessage(text: string, senderValue?: string): Promise<AnalyzeResult> {
  const { score: patternScore, reasons, categories } = runPatterns(text);
  const extractedUrls = extractUrls(text);

  const urlSignals: UrlSignal[] = [];
  for (const u of extractedUrls) {
    const r = await checkUrl(u); // also logs the embedded URL (feeds flagged feed)
    urlSignals.push({ url: u, verdict: r.verdict, score: r.score, communityReports: r.communityReports });
  }

  let score = patternScore + foldUrlSignals(urlSignals, reasons);

  // Sender-aware scoring (§4.2c): official registry + APPROVED PHONE reports
  let sender: SenderResult | undefined;
  if (senderValue !== undefined) {
    sender = await checkSender(senderValue);
    score += foldSenderSignal(sender, reasons, urlSignals);
  }

  score = clampScore(score);

  // Optional local-LLM second opinion (bounded ±25, rules-first)
  let llm: LlmSignal | undefined;
  if (await isLlmAvailable()) {
    const opinion = await llmClassifyMessage(text);
    if (opinion) {
      score = foldLlmSignal(score, opinion, categories, reasons);
      llm = {
        used: true,
        model: llmModel(),
        isScam: opinion.isScam,
        confidence: opinion.confidence,
      };
    }
  }

  const verdict = verdictForScore(score);

  await prisma.checkLog.create({
    data: {
      kind: 'MESSAGE',
      // fingerprint: first 120 chars, collapsed whitespace
      normalizedValue: text.trim().replace(/\s+/g, ' ').slice(0, 120).toLowerCase(),
      verdict,
      score,
    },
  });

  return { verdict, score, categories, reasons, extractedUrls, sender, llm };
}
