import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { normalizeReportValue, normalizePhone, normalizeUrl, normalizeSocialAccount } from '../lib/normalize';
import { prisma } from '../lib/prisma';

const router = Router();

const REPORT_TYPES = ['PHONE', 'URL', 'SOCIAL_ACCOUNT'] as const;
const SCAM_CATEGORIES = [
  'PRIZE_SCAM', 'DELIVERY_SCAM', 'JOB_SCAM', 'BANK_PHISHING', 'OTP_THEFT',
  'FAKE_SHOP', 'CHARITY_SCAM', 'CRYPTO_SCAM', 'OTHER',
] as const;

const PAGE_SIZE = 20;

const searchSchema = z.object({
  query: z.string().trim().max(500).optional(),
  type: z.enum(REPORT_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

// GET /api/reports — search; only APPROVED reports are public (§4.3)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { query, type, page } = searchSchema.parse(req.query);

    const where: Record<string, unknown> = { status: 'APPROVED' };
    if (type) where.type = type;
    if (query) {
      // Normalize the query in every possible shape so "0599 123 456"
      // matches a report stored as "+970599123456", etc.
      const candidates = new Set(
        [query, normalizePhone(query), normalizeUrl(query), normalizeSocialAccount(query)]
          .map((s) => s.toLowerCase())
          .filter(Boolean)
      );
      where.OR = [...candidates].flatMap((c) => [
        { normalizedValue: { contains: c } },
        { value: { contains: c } },
      ]);
    }

    const [total, items] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          type: true,
          value: true,
          description: true,
          scamCategory: true,
          reporterName: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({ items, total, page, pageSize: PAGE_SIZE });
  })
);

// GET /api/reports/stats (§4.3)
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const where = { status: 'APPROVED' };
    const [total, byTypeRaw, byCategoryRaw] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.groupBy({ by: ['type'], where, _count: { _all: true } }),
      prisma.report.groupBy({ by: ['scamCategory'], where, _count: { _all: true } }),
    ]);

    const byType = Object.fromEntries(byTypeRaw.map((r) => [r.type, r._count._all]));
    const byCategory = Object.fromEntries(byCategoryRaw.map((r) => [r.scamCategory, r._count._all]));
    res.json({ total, byType, byCategory });
  })
);

const createSchema = z.object({
  type: z.enum(REPORT_TYPES),
  value: z.string().trim().min(3).max(500),
  description: z.string().trim().min(5).max(2000),
  scamCategory: z.enum(SCAM_CATEGORIES),
  reporterName: z.string().trim().max(100).optional(),
});

// POST /api/reports — new reports start as PENDING (§4.3)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const report = await prisma.report.create({
      data: {
        ...data,
        reporterName: data.reporterName || null,
        normalizedValue: normalizeReportValue(data.type, data.value),
        status: 'PENDING',
      },
    });
    res.status(201).json({
      id: report.id,
      type: report.type,
      value: report.value,
      status: report.status,
      createdAt: report.createdAt,
      message: 'Report submitted and pending moderation',
    });
  })
);

export default router;
