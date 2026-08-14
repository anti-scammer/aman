import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import adminRouter from './routes/admin';
import blocklistRouter from './routes/blocklist';
import checkRouter from './routes/check';
import { articlesRouter, quizRouter } from './routes/content';
import flaggedUrlsRouter from './routes/flaggedUrls';
import reportsRouter from './routes/reports';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });
  api.use(checkRouter); // POST /check-url, POST /analyze-message, POST /check-social, GET /check-sender
  api.use('/reports', reportsRouter);
  api.use('/flagged-urls', flaggedUrlsRouter);
  api.use('/blocklist', blocklistRouter);
  api.use('/articles', articlesRouter);
  api.use('/quiz', quizRouter);
  api.use('/admin', adminRouter); // token-guarded moderation (§4.5)

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
