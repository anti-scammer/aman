import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

export const articlesRouter = Router();

// GET /api/articles — list (§4.4)
articlesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        titleAr: true,
        titleEn: true,
        summaryAr: true,
        summaryEn: true,
        category: true,
        createdAt: true,
      },
    });
    res.json(articles);
  })
);

// GET /api/articles/:slug — full article (§4.4)
articlesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const article = await prisma.article.findUnique({ where: { slug: req.params.slug } });
    if (!article) throw new ApiError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
    res.json(article);
  })
);

export const quizRouter = Router();

// GET /api/quiz (§4.4)
quizRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const questions = await prisma.quizQuestion.findMany();
    res.json(
      questions.map((q) => ({
        id: q.id,
        questionAr: q.questionAr,
        questionEn: q.questionEn,
        options: JSON.parse(q.optionsJson),
        correctOptionId: q.correctOptionId,
        explanationAr: q.explanationAr,
        explanationEn: q.explanationEn,
      }))
    );
  })
);
