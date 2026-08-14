import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { getLlmStatus } from '../services/llmAnalyzer';
import { analyzeMessage } from '../services/messageAnalyzer';
import { checkSender } from '../services/senderChecker';
import { checkSocial } from '../services/socialChecker';
import { checkUrl } from '../services/urlChecker';

const router = Router();

const checkUrlSchema = z.object({
  url: z.string().trim().min(4, 'URL is too short').max(2048, 'URL is too long'),
});

// POST /api/check-url (§4.1)
router.post(
  '/check-url',
  asyncHandler(async (req, res) => {
    const { url } = checkUrlSchema.parse(req.body);
    const result = await checkUrl(url);
    res.json({
      url,
      verdict: result.verdict,
      score: result.score,
      reasons: result.reasons,
      communityReports: result.communityReports,
    });
  })
);

const analyzeSchema = z.object({
  text: z.string().trim().min(3, 'Message is too short').max(10000, 'Message is too long'),
  sender: z.string().trim().min(1, 'Sender is empty').max(100, 'Sender is too long').optional(),
});

// POST /api/analyze-message (§4.2, sender-aware per §4.2c)
router.post(
  '/analyze-message',
  asyncHandler(async (req, res) => {
    const { text, sender } = analyzeSchema.parse(req.body);
    const result = await analyzeMessage(text, sender);
    res.json(result);
  })
);

const checkSocialSchema = z.object({
  input: z.string().trim().min(2, 'Input is too short').max(300, 'Input is too long'),
});

// POST /api/check-social (§4.2b)
router.post(
  '/check-social',
  asyncHandler(async (req, res) => {
    const { input } = checkSocialSchema.parse(req.body);
    const result = await checkSocial(input);
    res.json({
      input,
      platform: result.platform,
      handle: result.handle,
      verdict: result.verdict,
      score: result.score,
      reasons: result.reasons,
      communityReports: result.communityReports,
    });
  })
);

const checkSenderSchema = z.object({
  value: z.string().trim().min(1, 'Value is empty').max(100, 'Value is too long'),
});

// GET /api/check-sender?value=... (§4.2c)
router.get(
  '/check-sender',
  asyncHandler(async (req, res) => {
    const { value } = checkSenderSchema.parse(req.query);
    const result = await checkSender(value);
    res.json(result);
  })
);

// GET /api/llm-status — local-LLM layer status for UI/debugging
router.get(
  '/llm-status',
  asyncHandler(async (_req, res) => {
    res.json(await getLlmStatus());
  })
);

export default router;
