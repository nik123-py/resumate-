/**
 * score.ts
 * -----------------------------------------------
 * Resume credibility scoring endpoint.
 * Proxies to Gemini API server-side so API key
 * stays off the client.
 *
 *   POST /api/score         — score a resume
 *   POST /api/score/analyze — detailed analysis
 *   POST /api/score/nudge   — quick nudge text
 * -----------------------------------------------
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { scoreResume, generateNudge, analyzeResume } from '../services/geminiService';
import { getCachedScore, cacheScore } from '../db';
import { rateLimitMiddleware } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting to all scoring routes
router.use(rateLimitMiddleware);

/**
 * POST /api/score
 * Body: { cvId, appId?, cvText, jobDescription? }
 * Response: { ok, score, explanation, highlights }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cvId, appId, cvText, jobDescription } = req.body;

    if (!cvText || typeof cvText !== 'string') {
      res.status(400).json({ ok: false, error: 'cvText is required and must be a string' });
      return;
    }

    if (cvText.length > 200 * 1024) {
      res.status(413).json({ ok: false, error: 'cvText too large (max 200KB)' });
      return;
    }

    // Check cache first (hash of cvText + jobDescription)
    const hashInput = cvText + (jobDescription || '');
    const jobDescHash = crypto.createHash('md5').update(hashInput).digest('hex');

    if (cvId) {
      const cached = getCachedScore(cvId, jobDescHash);
      if (cached) {
        const cacheAge = Date.now() - cached.created_at;
        // Use cache if less than 1 hour old
        if (cacheAge < 60 * 60 * 1000) {
          console.info(`[Score] returning cached score for cv=${cvId} (age=${Math.round(cacheAge / 60000)}min)`);
          let highlights;
          try { highlights = JSON.parse(cached.highlights); } catch { highlights = []; }
          res.json({
            ok: true,
            score: cached.score,
            explanation: cached.explanation,
            highlights,
            cached: true,
          });
          return;
        }
      }
    }

    // Call Gemini
    console.info(`[Score] scoring resume cv=${cvId || 'unknown'} (${cvText.length} chars)`);
    const result = await scoreResume(cvText, jobDescription);

    // Cache the result
    if (cvId) {
      cacheScore(
        uuidv4(),
        cvId,
        appId || null,
        jobDescHash,
        result.score,
        result.explanation,
        JSON.stringify(result.highlights)
      );
    }

    console.info(`[Score] result: score=${result.score} for cv=${cvId || 'unknown'}`);

    res.json({
      ok: true,
      score: result.score,
      explanation: result.explanation,
      highlights: result.highlights,
      cached: false,
    });
  } catch (err: any) {
    console.error('[Score] error:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Failed to score resume',
      detail: err.message,
    });
  }
});

/**
 * POST /api/score/analyze
 * Body: { cvText }
 * Response: { ok, overallAssessment, suggestions }
 */
router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cvText } = req.body;

    if (!cvText || typeof cvText !== 'string') {
      res.status(400).json({ ok: false, error: 'cvText is required' });
      return;
    }

    console.info(`[Score] analyzing resume (${cvText.length} chars)`);
    const result = await analyzeResume(cvText);

    res.json({
      ok: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[Score] analyze error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to analyze resume' });
  }
});

/**
 * POST /api/score/nudge
 * Body: { weakestSection?, completionPercent?, lastAction? }
 * Response: { ok, nudge }
 */
router.post('/nudge', async (req: Request, res: Response): Promise<void> => {
  try {
    const nudge = await generateNudge(req.body);
    res.json({ ok: true, nudge });
  } catch (err: any) {
    console.error('[Score] nudge error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to generate nudge' });
  }
});

export default router;
