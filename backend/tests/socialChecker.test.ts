import { describe, expect, it } from 'vitest';
import { heuristicCheckSocial, parseSocialInput } from '../src/services/socialChecker';

describe('parseSocialInput', () => {
  it('detects platforms from profile URLs', () => {
    expect(parseSocialInput('facebook.com/jawwal.prizes2026').platform).toBe('FACEBOOK');
    expect(parseSocialInput('https://www.instagram.com/some_user').platform).toBe('INSTAGRAM');
    expect(parseSocialInput('tiktok.com/@dancer123').platform).toBe('TIKTOK');
    expect(parseSocialInput('t.me/ooredoo_gifts_ps').platform).toBe('TELEGRAM');
    expect(parseSocialInput('x.com/someone').platform).toBe('X');
    expect(parseSocialInput('twitter.com/someone').platform).toBe('X');
    expect(parseSocialInput('wa.me/970599000000').platform).toBe('WHATSAPP');
  });

  it('extracts the handle (stripping @ and URL noise)', () => {
    expect(parseSocialInput('facebook.com/jawwal.prizes2026').handle).toBe('jawwal.prizes2026');
    expect(parseSocialInput('https://tiktok.com/@Dancer123').handle).toBe('dancer123');
    expect(parseSocialInput('t.me/Ooredoo_Gifts_PS').handle).toBe('ooredoo_gifts_ps');
  });

  it('accepts bare @handles with UNKNOWN platform', () => {
    const p = parseSocialInput('@gaza_cheap_phones');
    expect(p.platform).toBe('UNKNOWN');
    expect(p.handle).toBe('gaza_cheap_phones');
  });
});

describe('heuristicCheckSocial', () => {
  it('flags a fake Jawwal facebook page as dangerous', () => {
    const r = heuristicCheckSocial('facebook.com/jawwal.prizes2026');
    expect(r.platform).toBe('FACEBOOK');
    expect(r.handle).toBe('jawwal.prizes2026');
    expect(r.verdict).toBe('dangerous');
    expect(r.score).toBeGreaterThanOrEqual(60);
    const codes = r.reasons.map((x) => x.code);
    expect(codes).toContain('BRAND_IMPERSONATION');
    expect(codes).toContain('HANDLE_SCAM_KEYWORDS');
    expect(codes).toContain('DIGIT_SUFFIX');
  });

  it('rates a plain personal handle as safe', () => {
    const r = heuristicCheckSocial('@ahmad.khalil');
    expect(r.verdict).toBe('safe');
    expect(r.score).toBeLessThan(30);
    expect(r.reasons.map((x) => x.code)).not.toContain('BRAND_IMPERSONATION');
  });

  it('does not flag an exact brand handle (could be the official page)', () => {
    const r = heuristicCheckSocial('facebook.com/jawwal');
    expect(r.reasons.map((x) => x.code)).not.toContain('BRAND_IMPERSONATION');
    expect(r.verdict).toBe('safe');
  });

  it('flags digit-suffix + keyword impersonation on any platform', () => {
    const r = heuristicCheckSocial('@bop_support_2026');
    expect(['suspicious', 'dangerous']).toContain(r.verdict);
    const codes = r.reasons.map((x) => x.code);
    expect(codes).toContain('BRAND_IMPERSONATION');
    expect(codes).toContain('DIGIT_SUFFIX');
  });

  it('provides bilingual reasons', () => {
    const r = heuristicCheckSocial('instagram.com/palpay.official.agent');
    expect(r.reasons.length).toBeGreaterThan(0);
    for (const reason of r.reasons) {
      expect(reason.message.length).toBeGreaterThan(0);
      expect(reason.messageEn.length).toBeGreaterThan(0);
    }
  });
});
