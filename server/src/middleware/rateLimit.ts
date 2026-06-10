import type { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
};

function clientKey(req: Request, prefix: string): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `${prefix}:${ip}`;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = 'Demasiadas peticiones. Inténtalo en unos minutos.', keyPrefix = 'rl' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = clientKey(req, keyPrefix);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ message, code: 'RATE_LIMIT' });
    }

    next();
  };
}

/** Limpia buckets expirados cada hora (evita crecimiento en memoria). */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 60 * 60 * 1000).unref();
