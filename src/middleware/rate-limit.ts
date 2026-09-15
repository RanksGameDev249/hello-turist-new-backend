import { Request, Response, NextFunction } from "express";
import { connectRedis, redis } from "../core/redis";

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
}

export function redisRateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await connectRedis();

      const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
      const key = `${options.keyPrefix}:${ip}`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, options.windowSeconds);
      }

      const ttl = await redis.ttl(key);
      res.setHeader("X-RateLimit-Limit", options.maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, options.maxRequests - count));

      if (count > options.maxRequests) {
        res.setHeader("Retry-After", Math.max(1, ttl));
        return res.status(429).json({
          success: false,
          data: null,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests. Please try again later.",
          },
          requestId: req.requestId,
        });
      }

      return next();
    } catch (error) {
      console.error("RATE_LIMIT_REDIS_ERROR:", error);
      // Fail open if Redis is temporarily unavailable so the API remains usable.
      return next();
    }
  };
}
