import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

// Every route below the guard requires a valid x-admin-token.
router.use(requireAdmin);

const REPORT_TYPES = ['PHONE', 'URL', 'SOCIAL_ACCOUNT'] as const;
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

const PAGE_SIZE = 20;

const queueSchema = z.object({
  // Moderators land on the pending queue; the other statuses are for review.
  status: z.enum(STATUSES).default('PENDING'),
  type: z.enum(REPORT_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

// GET /api/admin/reports — moderation queue (unlike the public route this
// returns every status and includes the description/reporter for review).
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { status, type, page } = queueSchema.parse(req.query);

    const where: Record<string, unknown> = { status };
    if (type) where.type = type;

    const [total, items] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        // Oldest first: the moderation queue is FIFO so nothing starves.
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          type: true,
          value: true,
          normalizedValue: true,
          description: true,
          scamCategory: true,
          reporterName: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({ items, total, page, pageSize: PAGE_SIZE });
  })
);

// GET /api/admin/stats — queue depth by status, and pending split by type.
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [byStatusRaw, pendingByTypeRaw] = await Promise.all([
      prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.report.groupBy({
        by: ['type'],
        where: { status: 'PENDING' },
        _count: { _all: true },
      }),
    ]);

    // Always report every status/type key, so the UI never renders "undefined".
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const row of byStatusRaw) byStatus[row.status] = row._count._all;

    const pendingByType = Object.fromEntries(REPORT_TYPES.map((t) => [t, 0])) as Record<
      string,
      number
    >;
    for (const row of pendingByTypeRaw) pendingByType[row.type] = row._count._all;

    res.json({ byStatus, pendingByType, total: Object.values(byStatus).reduce((a, b) => a + b, 0) });
  })
);

const decisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

// PATCH /api/admin/reports/:id — approve or reject. This is the only path that
// can make a community report publicly visible.
router.patch(
  '/reports/:id',
  asyncHandler(async (req, res) => {
    const { status } = decisionSchema.parse(req.body);
    const { id } = req.params;

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', 'Report not found');
    }

    const report = await prisma.report.update({
      where: { id },
      data: { status },
      select: { id: true, type: true, value: true, status: true, createdAt: true },
    });

    res.json({ ...report, previousStatus: existing.status });
  })
);

export default router;
