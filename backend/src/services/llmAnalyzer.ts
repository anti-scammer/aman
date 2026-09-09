/**
 * Optional local-LLM analysis layer (Ollama).
 *
 * A bounded "second opinion" on top of the rule engine in
 * messageAnalyzer.ts — the rules always run first and the LLM can only
 * nudge the score by ±25 points (see foldLlmSignal in messageAnalyzer.ts).
 *
 * Config (env, all optional):
 *   OLLAMA_URL   — default http://localhost:11434
 *   OLLAMA_MODEL — default llama3.2
 *   LLM_ENABLED  — "true" | "false" | "auto" (default). "auto" probes
 *                  GET {OLLAMA_URL}/api/tags with a ~1s timeout and caches
 *                  the result for 60s.
 *
 * `llmClassifyMessage` never throws: any failure (unreachable, HTTP error,
 * malformed JSON, timeout) returns null and the caller falls back to
 * rule-only analysis.
 */
import { z } from 'zod';
import { claudeCliComplete, claudeCliModel, probeClaudeCli } from './claudeCli.js';

export const LLM_CATEGORIES = [
  'PRIZE_SCAM',
  'DELIVERY_SCAM',
  'JOB_SCAM',
  'BANK_PHISHING',
  'OTP_THEFT',
  'FAKE_SHOP',
  'CHARITY_SCAM',
  'CRYPTO_SCAM',
  'OTHER',
  'NONE',
] as const;

export type LlmCategory = (typeof LLM_CATEGORIES)[number];

export interface LlmVerdict {
  isScam: boolean;
  /** Clamped to [0, 1]. */
  confidence: number;
  category: LlmCategory;
  explanationEn: string;
  explanationAr: string;
}

const PROBE_TIMEOUT_MS = 1_000;
const REQUEST_TIMEOUT_MS = 12_000;
const PROBE_CACHE_TTL_MS = 60_000;

/** Read config lazily so tests / runtime can change env vars. */
function config() {
  return {
    url: (process.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/+$/, ''),
    model: process.env.OLLAMA_MODEL ?? 'llama3.2',
    enabled: (process.env.LLM_ENABLED ?? 'auto').trim().toLowerCase(),
    // "ollama" (default) or "claude-cli". The CLI provider borrows the Claude
    // Code sign-in on the machine, so it needs no API key but cannot run in
    // the Docker image. See claudeCli.ts.
    provider: (process.env.LLM_PROVIDER ?? 'ollama').trim().toLowerCase(),
  };
}

function usingClaudeCli(): boolean {
  return config().provider === 'claude-cli';
}

export function llmModel(): string {
  return usingClaudeCli() ? claudeCliModel() : config().model;
}

// ---------------------------------------------------------------------------
// Availability (probe + 60s cache)
// ---------------------------------------------------------------------------

let probeCache: { reachable: boolean; at: number } | null = null;

/** Test hook: forget the cached probe result. */
export function resetLlmProbeCache(): void {
  probeCache = null;
}

async function probeOllama(): Promise<boolean> {
  const now = Date.now();
  if (probeCache && now - probeCache.at < PROBE_CACHE_TTL_MS) return probeCache.reachable;

  // The CLI probe costs a real request, so the 60s cache above matters more
  // here than it does for Ollama's free /api/tags.
  if (usingClaudeCli()) {
    const ok = await probeClaudeCli();
    probeCache = { reachable: ok, at: now };
    return ok;
  }

  let reachable = false;
  try {
    const res = await fetch(`${config().url}/api/tags`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  probeCache = { reachable, at: now };
  return reachable;
}

/** Should the analyzer consult the LLM right now? */
export async function isLlmAvailable(): Promise<boolean> {
  const { enabled } = config();
  if (enabled === 'false') return false;
  if (enabled === 'true') return true;
  return probeOllama(); // "auto"
}

/** GET /api/llm-status payload. */
export async function getLlmStatus(): Promise<{
  enabled: boolean;
  reachable: boolean;
  model: string;
}> {
  const { enabled, model } = config();
  const reachable = await probeOllama(); // probe even when disabled (debugging aid)
  return {
    enabled: enabled === 'true' || (enabled !== 'false' && reachable),
    reachable,
    model,
  };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a scam-detection classifier protecting Palestinian users. You analyze SMS/WhatsApp/social messages (Arabic, Palestinian dialect, or English) and decide whether the message is a scam.

Respond with STRICT JSON only — no prose, no markdown, no code fences — exactly this shape:
{"isScam": <boolean>, "confidence": <number between 0 and 1>, "category": "<PRIZE_SCAM|DELIVERY_SCAM|JOB_SCAM|BANK_PHISHING|OTP_THEFT|FAKE_SHOP|CHARITY_SCAM|CRYPTO_SCAM|OTHER|NONE>", "explanationEn": "<max 25 words, English>", "explanationAr": "<short Arabic explanation>"}
Use category "NONE" when isScam is false. Common scams here: fake Jawwal/Ooredoo prize draws, Bank of Palestine / PalPay / Jawwal Pay phishing, OTP theft, fake parcel fees, fake job offers, fake shops, fake charity appeals, crypto "guaranteed profit".

Examples:

Message: "مبروك! ربحت 5000 دولار من سحب جوال. اضغط على الرابط واستلم جائزتك فورا قبل انتهاء العرض"
Answer: {"isScam": true, "confidence": 0.95, "category": "PRIZE_SCAM", "explanationEn": "Unsolicited prize-win claim impersonating Jawwal with an urgent link — classic prize scam.", "explanationAr": "ادعاء فوز بجائزة من سحب لم تشارك فيه مع رابط واستعجال — احتيال جوائز نموذجي"}

Message: "السلام عليكم، كيفك يا أمي؟ رح أمر عليكم يوم الجمعة بعد الغدا إن شاء الله"
Answer: {"isScam": false, "confidence": 0.9, "category": "NONE", "explanationEn": "Ordinary family message arranging a visit; no links, payments, or requests for information.", "explanationAr": "رسالة عائلية عادية لترتيب زيارة، بدون روابط أو طلبات مالية أو معلومات"}`;

/** Loose schema for whatever the model emits; normalized afterwards. */
const rawLlmSchema = z.object({
  isScam: z.boolean(),
  confidence: z.number(),
  category: z.string().optional(),
  explanationEn: z.string().optional(),
  explanationAr: z.string().optional(),
});

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Strip code fences / surrounding prose and keep the first {...} block. */
function extractJsonObject(content: string): string | null {
  const stripped = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/** Defensive parse of the model output. Returns null when unusable. */
export function parseLlmContent(content: string): LlmVerdict | null {
  const json = extractJsonObject(content);
  if (!json) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }

  const parsed = rawLlmSchema.safeParse(raw);
  if (!parsed.success || !Number.isFinite(parsed.data.confidence)) return null;

  const { isScam } = parsed.data;
  const upper = (parsed.data.category ?? '').trim().toUpperCase();
  const category: LlmCategory = (LLM_CATEGORIES as readonly string[]).includes(upper)
    ? (upper as LlmCategory)
    : isScam
      ? 'OTHER'
      : 'NONE';

  return {
    isScam,
    confidence: clamp01(parsed.data.confidence),
    category,
    explanationEn: (parsed.data.explanationEn ?? '').trim(),
    explanationAr: (parsed.data.explanationAr ?? '').trim(),
  };
}

/**
 * Ask the local LLM for a second opinion on a message.
 * Never throws — returns null on any failure or timeout (~12s).
 */
export async function llmClassifyMessage(text: string): Promise<LlmVerdict | null> {
  if (usingClaudeCli()) {
    const content = await claudeCliComplete(SYSTEM_PROMPT, text);
    // The CLI wraps its answer in a ```json fence despite being asked not to;
    // parseLlmContent already strips fences, so nothing special is needed.
    return content === null ? null : parseLlmContent(content);
  }

  const { url, model } = config();
  try {
    const res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        options: { temperature: 0.1, num_predict: 220 },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    const content = (data as { message?: { content?: unknown } })?.message?.content;
    if (typeof content !== 'string') return null;
    return parseLlmContent(content);
  } catch {
    return null; // unreachable, timeout, bad body — caller falls back to rules
  }
}
