import type { Server } from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// Test-only values, cleaned up around every case.
const PHONE = '+970590000101';
const URL_VALUE = 'https://admin-test-example.invalid/claim';
const TEST_VALUES = [PHONE, URL_VALUE];

const TOKEN = 'test-admin-token-0123456789';

let server: Server;
let baseUrl: string;

function api(path: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}/api${path}`, init);
}

function asAdmin(path: string, init: RequestInit = {}) {
  return api(path, {
    ...init,
    headers: { 'x-admin-token': TOKEN, ...(init.headers ?? {}) },
  });
}

/** Seed one pending report and return its id. */
async function seedPending(value = PHONE, type = 'PHONE') {
  const report = await prisma.report.create({
    data: {
      type,
      value,
      normalizedValue: value,
      description: 'moderation test fixture',
      scamCategory: 'PRIZE_SCAM',
      status: 'PENDING',
    },
  });
  return report.id;
}

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no ephemeral port');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await prisma.report.deleteMany({ where: { normalizedValue: { in: TEST_VALUES } } });
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

beforeEach(() => {
  process.env.ADMIN_TOKEN = TOKEN;
});

afterEach(async () => {
  process.env.ADMIN_TOKEN = TOKEN;
  await prisma.report.deleteMany({ where: { normalizedValue: { in: TEST_VALUES } } });
});

describe('admin auth', () => {
  it('rejects a request with no token', async () => {
    const res = await api('/admin/reports');
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a wrong token', async () => {
    const res = await api('/admin/reports', { headers: { 'x-admin-token': 'nope' } });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a token that is a prefix of the real one', async () => {
    const res = await api('/admin/reports', {
      headers: { 'x-admin-token': TOKEN.slice(0, -1) },
    });
    expect(res.status).toBe(401);
  });

  it('fails closed with 503 when ADMIN_TOKEN is unset', async () => {
    delete process.env.ADMIN_TOKEN;
    const res = await api('/admin/reports', { headers: { 'x-admin-token': TOKEN } });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('ADMIN_DISABLED');
  });

  it('fails closed with 503 when ADMIN_TOKEN is too short to be a secret', async () => {
    process.env.ADMIN_TOKEN = 'short';
    const res = await api('/admin/reports', { headers: { 'x-admin-token': 'short' } });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('ADMIN_DISABLED');
  });

  it('accepts the correct token', async () => {
    const res = await asAdmin('/admin/reports');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/reports', () => {
  it('defaults to the PENDING queue and includes review fields', async () => {
    const id = await seedPending();
    const body = await (await asAdmin('/admin/reports')).json();

    const item = body.items.find((r: any) => r.id === id);
    expect(item).toBeDefined();
    expect(item.status).toBe('PENDING');
    expect(item.description).toBe('moderation test fixture');
    // The public route hides these; the queue needs them to make a decision.
    expect(item.normalizedValue).toBe(PHONE);
    expect(body.pageSize).toBe(20);
    expect(typeof body.total).toBe('number');
  });

  it('filters by status and by type', async () => {
    const pendingId = await seedPending(PHONE, 'PHONE');
    await seedPending(URL_VALUE, 'URL');

    const byType = await (await asAdmin('/admin/reports?type=URL')).json();
    expect(byType.items.every((r: any) => r.type === 'URL')).toBe(true);
    expect(byType.items.map((r: any) => r.id)).not.toContain(pendingId);

    const approvedOnly = await (await asAdmin('/admin/reports?status=APPROVED')).json();
    expect(approvedOnly.items.every((r: any) => r.status === 'APPROVED')).toBe(true);
    expect(approvedOnly.items.map((r: any) => r.id)).not.toContain(pendingId);
  });

  it('rejects an unknown status with a 400 VALIDATION_ERROR', async () => {
    const res = await asAdmin('/admin/reports?status=BOGUS');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/admin/reports/:id', () => {
  it('approving a report makes it publicly searchable', async () => {
    const id = await seedPending();

    // Not public while pending.
    const before = await (await api(`/reports?query=${encodeURIComponent(PHONE)}`)).json();
    expect(before.items.map((r: any) => r.id)).not.toContain(id);

    const res = await asAdmin(`/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    expect(res.status).toBe(200);
    const decided = await res.json();
    expect(decided.status).toBe('APPROVED');
    expect(decided.previousStatus).toBe('PENDING');

    // Now public — this is the end-to-end gap the moderation API closes.
    const after = await (await api(`/reports?query=${encodeURIComponent(PHONE)}`)).json();
    expect(after.items.map((r: any) => r.id)).toContain(id);
  });

  it('rejecting a report keeps it out of public search', async () => {
    const id = await seedPending();
    const res = await asAdmin(`/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED' }),
    });
    expect(res.status).toBe(200);

    const after = await (await api(`/reports?query=${encodeURIComponent(PHONE)}`)).json();
    expect(after.items.map((r: any) => r.id)).not.toContain(id);
  });

  it('an approved PHONE report reaches the mobile blocklist', async () => {
    const id = await seedPending();
    await asAdmin(`/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });

    const blocklist = await (await api('/blocklist/phones')).json();
    expect(blocklist.entries.map((e: any) => e.number)).toContain(PHONE);
  });

  it('404s for an unknown id', async () => {
    const res = await asAdmin('/admin/reports/does-not-exist', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('NOT_FOUND');
  });

  it('refuses to set a status outside APPROVED/REJECTED', async () => {
    const id = await seedPending();
    const res = await asAdmin(`/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('cannot be moderated without a token', async () => {
    const id = await seedPending();
    const res = await api(`/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    expect(res.status).toBe(401);

    const still = await prisma.report.findUnique({ where: { id } });
    expect(still?.status).toBe('PENDING');
  });
});

describe('GET /api/admin/stats', () => {
  it('reports queue depth with every status and type key present', async () => {
    await seedPending();
    const body = await (await asAdmin('/admin/stats')).json();

    expect(Object.keys(body.byStatus).sort()).toEqual(['APPROVED', 'PENDING', 'REJECTED']);
    expect(Object.keys(body.pendingByType).sort()).toEqual(['PHONE', 'SOCIAL_ACCOUNT', 'URL']);
    expect(body.byStatus.PENDING).toBeGreaterThan(0);
    expect(body.pendingByType.PHONE).toBeGreaterThan(0);
    expect(body.total).toBe(
      body.byStatus.PENDING + body.byStatus.APPROVED + body.byStatus.REJECTED
    );
  });
});
