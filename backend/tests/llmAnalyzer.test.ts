/**
 * LLM analysis layer (src/services/llmAnalyzer.ts) + its integration into
 * analyzeMessage. Global fetch is mocked — no live Ollama needed.
 *
 * LLM_ENABLED is "false" globally (vitest.config.ts); tests that exercise
 * the layer force it to "true" (which skips the availability probe, so the
 * only fetch calls are the mocked /api/chat ones).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isLlmAvailable,
  llmClassifyMessage,
  resetLlmProbeCache,
} from '../src/services/llmAnalyzer';
import { analyzeMessage } from '../src/services/messageAnalyzer';

/** "مبروك! ربحت جائزة" → PRIZE_CONGRATS (30) + PRIZE_CLAIM (30) = rule score 60. */
const SCAM_TEXT = 'مبروك! ربحت جائزة';
/** "عاجل: منشوفك بكرا" → URGENCY (15) only = rule score 15. */
const MILD_TEXT = 'عاجل: منشوفك بكرا';

function ollamaChatResponse(content: string): Response {
  return {
    ok: true,
    json: async () => ({ message: { role: 'assistant', content } }),
  } as unknown as Response;
}

function mockChat(content: string) {
  const fn = vi.fn(async () => ollamaChatResponse(content));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const validScamJson = (extra = '') =>
  `{"isScam": true, "confidence": 0.9, "category": "PRIZE_SCAM", "explanationEn": "Classic prize scam.", "explanationAr": "احتيال جوائز نموذجي"${extra}}`;

beforeEach(() => {
  process.env.LLM_ENABLED = 'true';
  resetLlmProbeCache();
});

afterEach(() => {
  process.env.LLM_ENABLED = 'false';
  resetLlmProbeCache();
  vi.unstubAllGlobals();
});

describe('llmClassifyMessage parsing', () => {
  it('parses a valid strict-JSON response', async () => {
    const fetchMock = mockChat(validScamJson());
    const v = await llmClassifyMessage(SCAM_TEXT);
    expect(v).toEqual({
      isScam: true,
      confidence: 0.9,
      category: 'PRIZE_SCAM',
      explanationEn: 'Classic prize scam.',
      explanationAr: 'احتيال جوائز نموذجي',
    });
    // called Ollama's chat endpoint with the right shape
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('llama3.2');
    expect(body.stream).toBe(false);
    expect(body.format).toBe('json');
    expect(body.options).toEqual({ temperature: 0.1, num_predict: 220 });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('strips code fences, normalizes category case and clamps confidence', async () => {
    mockChat(
      '```json\n{"isScam": true, "confidence": 1.7, "category": "prize_scam", "explanationEn": "e", "explanationAr": "ش"}\n```'
    );
    const v = await llmClassifyMessage(SCAM_TEXT);
    expect(v?.confidence).toBe(1);
    expect(v?.category).toBe('PRIZE_SCAM');
  });

  it('maps an unknown category to OTHER (scam) / NONE (not scam)', async () => {
    mockChat('{"isScam": true, "confidence": 0.5, "category": "WEIRD_CAT"}');
    expect((await llmClassifyMessage(SCAM_TEXT))?.category).toBe('OTHER');
    mockChat('{"isScam": false, "confidence": 0.5, "category": "WEIRD_CAT"}');
    expect((await llmClassifyMessage(SCAM_TEXT))?.category).toBe('NONE');
  });

  it('returns null on malformed JSON', async () => {
    mockChat('sorry, I cannot classify this message');
    expect(await llmClassifyMessage(SCAM_TEXT)).toBeNull();
    mockChat('{"isScam": "yes", "confidence": "high"}'); // wrong types
    expect(await llmClassifyMessage(SCAM_TEXT)).toBeNull();
  });

  it('returns null on HTTP errors and network failures (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    expect(await llmClassifyMessage(SCAM_TEXT)).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    expect(await llmClassifyMessage(SCAM_TEXT)).toBeNull();
  });

  it('returns null on timeout (aborted request)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      })
    );
    expect(await llmClassifyMessage(SCAM_TEXT)).toBeNull();
  });
});

describe('availability (LLM_ENABLED / probe)', () => {
  it('is off when LLM_ENABLED=false and on when =true (no probe either way)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    process.env.LLM_ENABLED = 'false';
    expect(await isLlmAvailable()).toBe(false);
    process.env.LLM_ENABLED = 'true';
    expect(await isLlmAvailable()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('auto mode probes /api/tags and caches the result', async () => {
    process.env.LLM_ENABLED = 'auto';
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    expect(await isLlmAvailable()).toBe(true);
    expect(await isLlmAvailable()).toBe(true); // cached — no second probe
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/api/tags');
  });

  it('auto mode with unreachable Ollama disables the layer', async () => {
    process.env.LLM_ENABLED = 'auto';
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('ECONNREFUSED'))));
    expect(await isLlmAvailable()).toBe(false);
  });
});

describe('analyzeMessage integration (rules-first hybrid)', () => {
  it('high-confidence isScam raises the score and appends AI_ANALYSIS + category', async () => {
    mockChat(
      '{"isScam": true, "confidence": 0.9, "category": "BANK_PHISHING", "explanationEn": "Phishing.", "explanationAr": "تصيد"}'
    );
    const r = await analyzeMessage(SCAM_TEXT); // rule score 60
    expect(r.score).toBe(83); // 60 + round(0.9 * 25) = 60 + 23
    expect(r.verdict).toBe('dangerous');
    expect(r.categories).toContain('BANK_PHISHING'); // appended (not from rules)
    const ai = r.reasons.find((x) => x.code === 'AI_ANALYSIS');
    expect(ai?.message).toBe('تحليل الذكاء الاصطناعي: تصيد');
    expect(ai?.messageEn).toBe('AI analysis: Phishing.');
    expect(r.llm).toEqual({ used: true, model: 'llama3.2', isScam: true, confidence: 0.9 });
  });

  it('does not duplicate a category the rules already found', async () => {
    mockChat(validScamJson()); // category PRIZE_SCAM, already detected by rules
    const r = await analyzeMessage(SCAM_TEXT);
    expect(r.categories.filter((c) => c === 'PRIZE_SCAM')).toHaveLength(1);
  });

  it('confident not-scam lowers the score of a mild message', async () => {
    mockChat(
      '{"isScam": false, "confidence": 0.8, "category": "NONE", "explanationEn": "Benign.", "explanationAr": "سليمة"}'
    );
    const r = await analyzeMessage(MILD_TEXT); // rule score 15
    expect(r.score).toBe(0); // 15 - 20, clamped at 0
    expect(r.verdict).toBe('safe');
    expect(r.categories).toEqual([]); // NONE is never appended
    expect(r.llm).toEqual({ used: true, model: 'llama3.2', isScam: false, confidence: 0.8 });
  });

  it('guard: the LLM cannot push a rule score >= 60 below suspicious', async () => {
    mockChat(
      '{"isScam": false, "confidence": 1, "category": "NONE", "explanationEn": "Looks fine.", "explanationAr": "تبدو سليمة"}'
    );
    const r = await analyzeMessage(SCAM_TEXT); // rule score 60 (dangerous by rules)
    expect(r.score).toBe(35); // max(35, 60 - 25)
    expect(r.verdict).toBe('suspicious'); // never "safe"
  });

  it('malformed LLM output falls back to rule-only analysis (no llm key)', async () => {
    mockChat('total garbage, not json');
    const r = await analyzeMessage(SCAM_TEXT);
    expect(r.score).toBe(60); // pure rule score, untouched
    expect(r.verdict).toBe('dangerous');
    expect(r.llm).toBeUndefined();
    expect(r.reasons.map((x) => x.code)).not.toContain('AI_ANALYSIS');
  });

  it('timeout falls back to rule-only analysis (no llm key)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      })
    );
    const r = await analyzeMessage(SCAM_TEXT);
    expect(r.score).toBe(60);
    expect(r.llm).toBeUndefined();
  });

  it('LLM disabled: no fetch at all, rule-only result', async () => {
    process.env.LLM_ENABLED = 'false';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const r = await analyzeMessage(SCAM_TEXT);
    expect(r.score).toBe(60);
    expect(r.llm).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
