import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errorHandler';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Shared in-process store — acceptable for single-node; swap for Redis adapter in multi-node
const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

const defaultKeyGenerator = (req: Request): string =>
  req.ip || req.socket.remoteAddress || 'unknown';

export const createRateLimiter = (config: RateLimitConfig) => {
  const { windowMs, maxRequests, keyGenerator = defaultKeyGenerator } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetInSec = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetInSec);

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', resetInSec);
      return next(new RateLimitError(`Rate limit exceeded. Retry in ${resetInSec}s`));
    }

    next();
  };
};

// ── Pre-built limiters ──────────────────────────────────────────────────────

/** Strict limiter for auth endpoints — always active regardless of NODE_ENV */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  maxRequests: 10,           // 10 attempts per window (increased from 5 to allow dev testing)
});

/** General API limiter — 200 req / 15 min */
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 200,
});

/** Upload-specific limiter — 20 req / min */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
});

// ── Periodic cleanup of expired entries (every 10 min) ─────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000).unref(); // unref so this timer doesn't keep the process alive
