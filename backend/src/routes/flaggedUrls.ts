import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';

const router = Router();
const PAGE_SIZE = 20;

interface FlaggedItem {
  url: string;
  verdict: string;
  score: number;
  timesChecked: number;
  lastSeenAt: Date;
  source: 'check' | 'report';
}

// GET /api/flagged-urls — "active scams right now" feed (§4.3b).
// Merges (a) URL checks that scored suspicious/dangerous with
// (b) approved URL reports. Deduped by normalized URL.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page } = z
      .object({ page: z.coerce.number().int().min(1).default(1) })
      .parse(req.query);

    const [flaggedChecks, approvedUrlReports] = await Promise.all([
      prisma.checkLog.findMany({
        where: { kind: 'URL', verdict: { in: ['suspicious', 'dangerous'] } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      prisma.report.findMany({
        where: { type: 'URL', status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    ]);

    // timesChecked counts ALL checks of that URL (any verdict)
    const allUrlChecks = await prisma.checkLog.groupBy({
      by: ['normalizedValue'],
      where: { kind: 'URL' },
      _count: { _all: true },
    });
    const checkCounts = new Map(allUrlChecks.map((c) => [c.normalizedValue, c._count._all]));

    const merged = new Map<string, FlaggedItem>();

    for (const log of flaggedChecks) {
      const existing = merged.get(log.normalizedValue);
      if (!existing || log.createdAt > existing.lastSeenAt) {
        merged.set(log.normalizedValue, {
          url: log.normalizedValue,
          verdict: log.verdict,
          score: log.score,
          timesChecked: checkCounts.get(log.normalizedValue) ?? 1,
          lastSeenAt: log.createdAt,
          source: 'check',
        });
      }
    }

    for (const report of approvedUrlReports) {
      const existing = merged.get(report.normalizedValue);
      if (!existing) {
        merged.set(report.normalizedValue, {
          url: report.normalizedValue,
          verdict: 'dangerous',
          score: 90,
          timesChecked: checkCounts.get(report.normalizedValue) ?? 0,
          lastSeenAt: report.createdAt,
          source: 'report',
        });
      } else {
        // Community-confirmed → escalate and attribute to the report
        existing.source = 'report';
        existing.verdict = 'dangerous';
        existing.score = Math.max(existing.score, 90);
        if (report.createdAt > existing.lastSeenAt) existing.lastSeenAt = report.createdAt;
      }
    }

    const items = [...merged.values()].sort(
      (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()
    );
    const total = items.length;
    const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    res.json({ items: pageItems, total, page, pageSize: PAGE_SIZE });
  })
);

export default router;
