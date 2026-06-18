import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errorHandler';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  windowMs: number; // Time window in ms
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Function to generate rate limit key
  handler?: (req: Request, res: Response, next: NextFunction) => void; // Custom handler
}

const defaultKeyGenerator = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const createRateLimiter = (config: RateLimitConfig) => {
  const { windowMs, maxRequests, keyGenerator = defaultKeyGenerator, handler } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Initialize or get rate limit entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = { count: 0, resetTime: now + windowMs };
    }

    store[key].count++;

    // Add rate limit headers
    const remaining = Math.max(0, maxRequests - store[key].count);
    const resetTime = Math.ceil((store[key].resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (store[key].count > maxRequests) {
      if (handler) {
        return handler(req, res, next);
      }
      return next(new RateLimitError(`Rate limit exceeded. Try again in ${resetTime} seconds`));
    }

    next();
  };
};

// Predefined rate limiters
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Stricter limit for auth
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
});

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 10 * 60 * 1000); // Cleanup every 10 minutes
