import { describe, expect, it } from 'vitest';
import { analyzeMessageText, extractUrls } from '../src/services/messageAnalyzer';

describe('extractUrls', () => {
  it('extracts full and scheme-less URLs from text', () => {
    const urls = extractUrls('ادفع هنا: bit.ly/xy أو https://palpay-bonus.xyz/gift.');
    expect(urls).toContain('bit.ly/xy');
    expect(urls).toContain('https://palpay-bonus.xyz/gift');
  });

  it('returns empty array for plain text', () => {
    expect(extractUrls('مرحبا كيف حالك اليوم؟')).toEqual([]);
  });
});

describe('analyzeMessageText', () => {
  it('flags a classic Arabic prize scam as dangerous', () => {
    const r = analyzeMessageText(
      'مبروك! ربحت 10000 شيكل من جوال. ادفع رسوم التوصيل خلال 24 ساعة هنا: bit.ly/xy'
    );
    expect(r.verdict).toBe('dangerous');
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.categories).toContain('PRIZE_SCAM');
    expect(r.extractedUrls).toContain('bit.ly/xy');
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it('rates a benign Arabic message as safe', () => {
    const r = analyzeMessageText('مرحبا أمي، سأتأخر قليلا اليوم. أوصلي سلامي للجميع.');
    expect(r.verdict).toBe('safe');
    expect(r.score).toBeLessThan(30);
    expect(r.categories).toEqual([]);
  });

  it('rates a benign English message as safe', () => {
    const r = analyzeMessageText('Hey, are we still meeting at the cafe at 5pm?');
    expect(r.verdict).toBe('safe');
    expect(r.categories).toEqual([]);
  });

  it('detects English prize scams', () => {
    const r = analyzeMessageText(
      'Congratulations! You have won a $1000 prize. Claim now, expires today!'
    );
    expect(['suspicious', 'dangerous']).toContain(r.verdict);
    expect(r.categories).toContain('PRIZE_SCAM');
  });

  it('detects OTP theft attempts', () => {
    const r = analyzeMessageText('أنا موظف من بنك فلسطين، أرسل لي رمز التحقق الذي وصلك فورا');
    expect(r.verdict).toBe('dangerous');
    expect(r.categories).toContain('OTP_THEFT');
  });

  it('detects delivery-fee scams', () => {
    const r = analyzeMessageText('لديك طرد معلق، ادفع رسوم التوصيل 45 شيكل عبر الرابط');
    expect(r.categories).toContain('DELIVERY_SCAM');
    expect(['suspicious', 'dangerous']).toContain(r.verdict);
  });

  it('folds dangerous embedded URLs into the score', () => {
    const withUrl = analyzeMessageText('تحقق من هذا: https://jawwal-prize.win/claim');
    const withoutUrl = analyzeMessageText('تحقق من هذا');
    expect(withUrl.score).toBeGreaterThan(withoutUrl.score);
    expect(withUrl.reasons.map((x) => x.code)).toContain('DANGEROUS_URL');
  });

  it('returns bilingual reasons', () => {
    const r = analyzeMessageText('مبروك ربحت جائزة كبرى!');
    for (const reason of r.reasons) {
      expect(reason.message.length).toBeGreaterThan(0);
      expect(reason.messageEn.length).toBeGreaterThan(0);
    }
  });
});
