import { describe, expect, it } from 'vitest';
import {
  checkSender,
  classifySenderType,
  heuristicCheckSender,
} from '../src/services/senderChecker';

describe('classifySenderType', () => {
  it('classifies phone-like values as PHONE with canonical +970 form', () => {
    expect(classifySenderType('+970 599-123-456')).toEqual({
      type: 'PHONE',
      normalizedValue: '+970599123456',
    });
    expect(classifySenderType('0599123456').normalizedValue).toBe('+970599123456');
    expect(classifySenderType('00970599123456').type).toBe('PHONE');
  });

  it('classifies alphanumeric values as SENDER_ID (case-insensitive)', () => {
    expect(classifySenderType('JAWWAL')).toEqual({ type: 'SENDER_ID', normalizedValue: 'jawwal' });
    expect(classifySenderType('  Bank of Palestine ').type).toBe('SENDER_ID');
  });
});

describe('heuristicCheckSender (official registry)', () => {
  it('recognizes official Palestinian sender IDs', () => {
    for (const id of ['JAWWAL', 'ooredoo', 'Bank of Palestine', 'PALPAY']) {
      const r = heuristicCheckSender(id);
      expect(r.trust).toBe('official');
      expect(r.verdict).toBe('safe');
      expect(r.reasons.map((x) => x.code)).toContain('OFFICIAL_SENDER');
    }
  });

  it('returns unknown (score 0, safe, UNKNOWN_SENDER) for unrecognized senders', () => {
    const r = heuristicCheckSender('SOME-SHOP');
    expect(r.trust).toBe('unknown');
    expect(r.verdict).toBe('safe');
    expect(r.score).toBe(0);
    expect(r.reasons.map((x) => x.code)).toContain('UNKNOWN_SENDER');
  });
});

describe('checkSender (DB-backed, uses seeded reports)', () => {
  it('marks the official JAWWAL sender as official/safe', async () => {
    const r = await checkSender('JAWWAL');
    expect(r.type).toBe('SENDER_ID');
    expect(r.trust).toBe('official');
    expect(r.verdict).toBe('safe');
  });

  it('marks the seeded reported phone +970599123456 as reported/dangerous', async () => {
    const r = await checkSender('+970599123456');
    expect(r.type).toBe('PHONE');
    expect(r.trust).toBe('reported');
    expect(r.verdict).toBe('dangerous');
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.communityReports).toBeGreaterThanOrEqual(1);
    expect(r.reasons.map((x) => x.code)).toContain('REPORTED_SENDER');
  });

  it('matches reported phones in any written form (normalization)', async () => {
    const r = await checkSender('0599 123 456');
    expect(r.normalizedValue).toBe('+970599123456');
    expect(r.trust).toBe('reported');
  });

  it('returns unknown for an unreported phone', async () => {
    const r = await checkSender('+970590000001');
    expect(r.trust).toBe('unknown');
    expect(r.verdict).toBe('safe');
    expect(r.score).toBe(0);
  });
});
