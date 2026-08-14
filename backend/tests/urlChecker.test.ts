import { describe, expect, it } from 'vitest';
import { heuristicCheckUrl, registrableDomain, verdictForScore } from '../src/services/urlChecker';

describe('verdictForScore', () => {
  it('maps score bands to verdicts (safe <30, suspicious 30-59, dangerous >=60)', () => {
    expect(verdictForScore(0)).toBe('safe');
    expect(verdictForScore(29)).toBe('safe');
    expect(verdictForScore(30)).toBe('suspicious');
    expect(verdictForScore(59)).toBe('suspicious');
    expect(verdictForScore(60)).toBe('dangerous');
    expect(verdictForScore(100)).toBe('dangerous');
  });
});

describe('registrableDomain', () => {
  it('extracts eTLD+1', () => {
    expect(registrableDomain('www.google.com')).toBe('google.com');
    expect(registrableDomain('login.jawwal-prize.win')).toBe('jawwal-prize.win');
    expect(registrableDomain('portal.jawwal.com.ps')).toBe('jawwal.com.ps');
  });
});

describe('heuristicCheckUrl', () => {
  it('flags a phishy brand-lookalike URL as dangerous', () => {
    const r = heuristicCheckUrl('https://jawwal-prize.win/claim');
    expect(r.verdict).toBe('dangerous');
    expect(r.score).toBeGreaterThanOrEqual(60);
    const codes = r.reasons.map((x) => x.code);
    expect(codes).toContain('BRAND_LOOKALIKE');
    expect(codes).toContain('SUSPICIOUS_TLD');
    expect(codes).toContain('SCAM_KEYWORDS');
  });

  it('rates https://www.google.com as safe', () => {
    const r = heuristicCheckUrl('https://www.google.com');
    expect(r.verdict).toBe('safe');
    expect(r.score).toBeLessThan(30);
  });

  it('does not flag official Palestinian brand domains as lookalikes', () => {
    const r = heuristicCheckUrl('https://www.jawwal.ps/offers');
    expect(r.reasons.map((x) => x.code)).not.toContain('BRAND_LOOKALIKE');
    expect(r.verdict).toBe('safe');
  });

  it('detects a Levenshtein lookalike (bankofpalestlne)', () => {
    const r = heuristicCheckUrl('https://bankofpalestlne.com/login');
    expect(r.reasons.map((x) => x.code)).toContain('BRAND_LOOKALIKE');
  });

  it('marks URL shorteners as at least suspicious', () => {
    const r = heuristicCheckUrl('https://bit.ly/3xYzAbC');
    expect(r.reasons.map((x) => x.code)).toContain('URL_SHORTENER');
    expect(['suspicious', 'dangerous']).toContain(r.verdict);
  });

  it('flags IP-literal hosts', () => {
    const r = heuristicCheckUrl('http://192.168.13.37/bank/login');
    expect(r.reasons.map((x) => x.code)).toContain('IP_LITERAL');
    expect(r.reasons.map((x) => x.code)).toContain('NO_HTTPS');
  });

  it('flags punycode domains', () => {
    const r = heuristicCheckUrl('https://xn--jwwal-hva.com/login');
    expect(r.reasons.map((x) => x.code)).toContain('PUNYCODE_DOMAIN');
  });

  it('flags @ credential trick', () => {
    const r = heuristicCheckUrl('https://bankofpalestine.com@evil-site.top/login');
    expect(r.reasons.map((x) => x.code)).toContain('AT_IN_URL');
  });

  it('provides bilingual reasons', () => {
    const r = heuristicCheckUrl('https://jawwal-prize.win/claim');
    for (const reason of r.reasons) {
      expect(reason.message.length).toBeGreaterThan(0);
      expect(reason.messageEn.length).toBeGreaterThan(0);
    }
  });
});
