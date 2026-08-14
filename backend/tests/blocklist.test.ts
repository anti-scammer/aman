import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// Test-only phone numbers (unlikely to collide with seed data).
const PHONE_A = '+970590000001'; // 3 reports: 2x PRIZE_SCAM, 1x OTP_THEFT → PRIZE_SCAM
const PHONE_B = '+970590000002'; // 1 report, older than the `since` cutoff
const TEST_NUMBERS = [PHONE_A, PHONE_B];

const HOUR = 60 * 60 * 1000;
const now = Date.now();
// PHONE_A's latest report is 1h old; PHONE_B's only report is 48h old.
const SINCE_CUTOFF = new Date(now - 24 * HOUR).toISOString();

let server: Server;
let baseUrl: string;

async function getBlocklist(query = ''): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}/api/blocklist/phones${query}`);
  return { status: res.status, body: await res.json() };
}

beforeAll(async () => {
  await prisma.report.deleteMany({ where: { normalizedValue: { in: TEST_NUMBERS } } });
  await prisma.report.createMany({
    data: [
      { type: 'PHONE', value: PHONE_A, normalizedValue: PHONE_A, scamCategory: 'PRIZE_SCAM',
        description: 'test', status: 'APPROVED', createdAt: new Date(now - 30 * HOUR) },
      { type: 'PHONE', value: PHONE_A, normalizedValue: PHONE_A, scamCategory: 'OTP_THEFT',
        description: 'test', status: 'APPROVED', createdAt: new Date(now - 20 * HOUR) },
      { type: 'PHONE', value: PHONE_A, normalizedValue: PHONE_A, scamCategory: 'PRIZE_SCAM',
        description: 'test', status: 'APPROVED', createdAt: new Date(now - 1 * HOUR) },
      { type: 'PHONE', value: PHONE_B, normalizedValue: PHONE_B, scamCategory: 'JOB_SCAM',
        description: 'test', status: 'APPROVED', createdAt: new Date(now - 48 * HOUR) },
      // Non-approved / non-phone rows that must NEVER appear in the blocklist:
      { type: 'PHONE', value: PHONE_B, normalizedValue: PHONE_B, scamCategory: 'JOB_SCAM',
        description: 'test-pending', status: 'PENDING', createdAt: new Date(now) },
      { type: 'PHONE', value: PHONE_B, normalizedValue: PHONE_B, scamCategory: 'JOB_SCAM',
        description: 'test-rejected', status: 'REJECTED', createdAt: new Date(now) },
    ],
  });

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no ephemeral port');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await prisma.report.deleteMany({ where: { normalizedValue: { in: TEST_NUMBERS } } });
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

describe('GET /api/blocklist/phones', () => {
  it('returns the full aggregated blocklist with the documented shape', async () => {
    const { status, body } = await getBlocklist();
    expect(status).toBe(200);

    // Top-level shape
    expect(typeof body.updatedAt).toBe('string');
    expect(new Date(body.updatedAt).toString()).not.toBe('Invalid Date');
    expect(body.count).toBe(body.entries.length);
    expect(body.totalCount).toBe(body.count); // no `since` → full list
    expect(Array.isArray(body.entries)).toBe(true);

    // Entry shape (exactly number/reports/category)
    for (const e of body.entries) {
      expect(Object.keys(e).sort()).toEqual(['category', 'number', 'reports']);
      expect(typeof e.number).toBe('string');
      expect(typeof e.reports).toBe('number');
      expect(typeof e.category).toBe('string');
    }

    // Sorted by reports desc
    const counts = body.entries.map((e: any) => e.reports);
    expect(counts).toEqual([...counts].sort((a: number, b: number) => b - a));

    // Seeded approved phone reports are present (see prisma/seed.ts)
    const numbers = body.entries.map((e: any) => e.number);
    expect(numbers).toContain('+970599123456');
    const seeded = body.entries.find((e: any) => e.number === '+970599123456');
    expect(seeded.category).toBe('PRIZE_SCAM');

    // Aggregation: 3 approved reports for PHONE_A, majority category wins
    const a = body.entries.find((e: any) => e.number === PHONE_A);
    expect(a).toEqual({ number: PHONE_A, reports: 3, category: 'PRIZE_SCAM' });

    // PENDING/REJECTED reports are excluded: PHONE_B has exactly 1
    const b = body.entries.find((e: any) => e.number === PHONE_B);
    expect(b).toEqual({ number: PHONE_B, reports: 1, category: 'JOB_SCAM' });

    // Seeded pending phone report never leaks
    expect(numbers).not.toContain('+970569998877');
  });

  it('filters with ?since= to numbers whose latest report is newer, keeping totalCount', async () => {
    const full = await getBlocklist();
    const { status, body } = await getBlocklist(`?since=${encodeURIComponent(SINCE_CUTOFF)}`);
    expect(status).toBe(200);

    const numbers = body.entries.map((e: any) => e.number);
    // PHONE_A's latest approved report (1h ago) is newer than the 24h cutoff…
    expect(numbers).toContain(PHONE_A);
    // …and even in the delta its reports count covers ALL its approved reports
    const a = body.entries.find((e: any) => e.number === PHONE_A);
    expect(a.reports).toBe(3);
    // PHONE_B's only approved report (48h ago) is older → excluded
    expect(numbers).not.toContain(PHONE_B);

    expect(body.count).toBe(body.entries.length);
    // totalCount still reflects the FULL list so clients can detect drift
    expect(body.totalCount).toBe(full.body.totalCount);
    expect(body.count).toBeLessThan(body.totalCount);
  });

  it('returns an empty delta (but real totalCount) for a future since', async () => {
    const future = new Date(now + 24 * HOUR).toISOString();
    const { status, body } = await getBlocklist(`?since=${encodeURIComponent(future)}`);
    expect(status).toBe(200);
    expect(body.count).toBe(0);
    expect(body.entries).toEqual([]);
    expect(body.totalCount).toBeGreaterThan(0);
  });

  it('rejects a malformed since with a 400 VALIDATION_ERROR', async () => {
    const { status, body } = await getBlocklist('?since=yesterday');
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
