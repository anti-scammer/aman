import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';

const router = Router();

const querySchema = z.object({
  // ISO-8601 timestamp, e.g. 2026-07-01T00:00:00Z or with a numeric offset.
  since: z.string().datetime({ offset: true }).optional(),
});

interface BlocklistEntry {
  number: string;
  reports: number;
  category: string;
  /** Internal only (sorting / `since` filtering) — stripped from the response. */
  latestAt: Date;
}

// GET /api/blocklist/phones — public sync endpoint for on-device call
// screening. Aggregates APPROVED PHONE reports by normalized number.
// `?since=<iso>` returns only numbers whose LATEST report is newer than the
// cutoff; `totalCount` always reflects the full list so clients can detect
// drift and trigger a full re-sync.
router.get(
  '/phones',
  asyncHandler(async (req, res) => {
    const { since } = querySchema.parse(req.query);

    const reports = await prisma.report.findMany({
      where: { type: 'PHONE', status: 'APPROVED' },
      select: { normalizedValue: true, scamCategory: true, createdAt: true },
    });

    // Aggregate per number: report count, latest report time, and per-category
    // frequencies (most frequent wins; ties broken by most recent report).
    const byNumber = new Map<
      string,
      { entry: BlocklistEntry; categories: Map<string, { count: number; latestAt: Date }> }
    >();

    for (const r of reports) {
      let agg = byNumber.get(r.normalizedValue);
      if (!agg) {
        agg = {
          entry: { number: r.normalizedValue, reports: 0, category: r.scamCategory, latestAt: r.createdAt },
          categories: new Map(),
        };
        byNumber.set(r.normalizedValue, agg);
      }
      agg.entry.reports += 1;
      if (r.createdAt > agg.entry.latestAt) agg.entry.latestAt = r.createdAt;

      const cat = agg.categories.get(r.scamCategory) ?? { count: 0, latestAt: r.createdAt };
      cat.count += 1;
      if (r.createdAt > cat.latestAt) cat.latestAt = r.createdAt;
      agg.categories.set(r.scamCategory, cat);
    }

    const all: BlocklistEntry[] = [];
    for (const { entry, categories } of byNumber.values()) {
      let best: { name: string; count: number; latestAt: Date } | null = null;
      for (const [name, c] of categories) {
        if (!best || c.count > best.count || (c.count === best.count && c.latestAt > best.latestAt)) {
          best = { name, ...c };
        }
      }
      entry.category = best!.name;
      all.push(entry);
    }

    all.sort(
      (a, b) => b.reports - a.reports || b.latestAt.getTime() - a.latestAt.getTime()
    );

    const cutoff = since ? new Date(since) : null;
    const selected = cutoff ? all.filter((e) => e.latestAt > cutoff) : all;

    res.json({
      updatedAt: new Date().toISOString(),
      count: selected.length,
      totalCount: all.length,
      entries: selected.map(({ number, reports: n, category }) => ({
        number,
        reports: n,
        category,
      })),
    });
  })
);

export default router;
