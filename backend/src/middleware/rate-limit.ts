import type { NextFunction, Request, Response } from "express";
import { redisClient } from "../redis/client";

export const createRateLimiter = (
  windowMs: number,
  maxRequests: number,
  keyGenerator: (req: Request) => string,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rate:${keyGenerator(req)}`;
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, Math.ceil(windowMs / 1000));
    }
    if (current > maxRequests) {
      const ttl = await redisClient.ttl(key);
      return res.status(429).json({
        error: "rate_limit_exceeded",
        retryAfter: ttl,
      });
    }
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - current).toString());
    return next();
  };
};

export const apiRateLimit = createRateLimiter(
  15 * 60 * 1000,
  100,
  (req) => {
    const apiKey = req.header("x-api-key");
    return apiKey ? `apikey:${apiKey}` : `ip:${req.ip}`;
  },
);

export const authRateLimit = createRateLimiter(
  15 * 60 * 1000,
  10,
  (req) => `ip:${req.ip}`,
);
