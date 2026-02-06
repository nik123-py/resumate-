/**
 * rateLimit.ts
 * -----------------------------------------------
 * Simple in-memory rate limiter. Limits per-user
 * requests to the scoring endpoint to prevent
 * Gemini API abuse.
 * -----------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

const MAX_REQUESTS = 10;       // per window
const WINDOW_MS   = 60 * 1000; // 1 minute

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.userId || req.ip || 'global';
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > MAX_REQUESTS) {
    res.status(429).json({
      ok: false,
      error: `Rate limit exceeded. Max ${MAX_REQUESTS} requests per minute.`,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    });
    return;
  }

  // Add rate limit headers
  res.set('X-RateLimit-Limit', String(MAX_REQUESTS));
  res.set('X-RateLimit-Remaining', String(MAX_REQUESTS - bucket.count));
  res.set('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  next();
}

// Cleanup stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60 * 1000);
