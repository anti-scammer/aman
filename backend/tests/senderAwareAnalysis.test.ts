import { describe, expect, it } from 'vitest';
import { analyzeMessage, analyzeMessageText } from '../src/services/messageAnalyzer';

describe('sender-aware analyzeMessageText (§4.2c scoring rules)', () => {
  it('keeps a prize scam asking for OTP dangerous despite an official sender (SPOOFING_WARNING)', () => {
    const r = analyzeMessageText(
      'مبروك! ربحت 10000 شيكل من جوال. أرسل لنا رمز التحقق الذي وصلك فورا لاستلام الجائزة',
      'JAWWAL'
    );
    expect(r.sender?.trust).toBe('official');
    expect(r.verdict).toBe('dangerous');
    const codes = r.reasons.map((x) => x.code);
    expect(codes).toContain('SPOOFING_WARNING');
    expect(codes).not.toContain('OFFICIAL_SENDER'); // reduction was skipped
  });

  it('skips the official reduction when the message carries a dangerous link', () => {
    const r = analyzeMessageText(
      'عرض خاص لزبائن جوال، اضغط الرابط: https://jawwal-prize.win/claim',
      'JAWWAL'
    );
    const codes = r.reasons.map((x) => x.code);
    expect(codes).toContain('DANGEROUS_URL');
    expect(codes).toContain('SPOOFING_WARNING');
    expect(codes).not.toContain('OFFICIAL_SENDER');
    expect(['suspicious', 'dangerous']).toContain(r.verdict);
  });

  it('reduces the score (floored at 0) for a benign message from an official sender', () => {
    const r = analyzeMessageText('تم تعبئة رصيدك بنجاح. شكرا لاستخدامكم خدماتنا.', 'JAWWAL');
    expect(r.sender?.trust).toBe('official');
    expect(r.verdict).toBe('safe');
    expect(r.score).toBeGreaterThanOrEqual(0); // clamped, never negative
    expect(r.reasons.map((x) => x.code)).toContain('OFFICIAL_SENDER');
  });

  it('omits the sender object when no sender is given', () => {
    const r = analyzeMessageText('Hey, are we still meeting at the cafe at 5pm?');
    expect(r.sender).toBeUndefined();
  });
});

describe('sender-aware analyzeMessage (DB-backed, uses seeded reports)', () => {
  it('flags a benign-ish message from a reported sender (+40 REPORTED_SENDER)', async () => {
    const withSender = await analyzeMessage('مرحبا، تواصل معي على هذا الرقم من فضلك', '+970599123456');
    expect(withSender.sender?.trust).toBe('reported');
    expect(withSender.reasons.map((x) => x.code)).toContain('REPORTED_SENDER');
    expect(withSender.score).toBeGreaterThanOrEqual(40);
    expect(['suspicious', 'dangerous']).toContain(withSender.verdict);
  });

  it('keeps a benign message from an official sender safe', async () => {
    const r = await analyzeMessage('فاتورتك الشهرية جاهزة. شكرا لكم.', 'JAWWAL');
    expect(r.sender?.trust).toBe('official');
    expect(r.verdict).toBe('safe');
  });
});
