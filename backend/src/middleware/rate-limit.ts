import type { FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";
import { redisClient } from "../redis/client";

type RedisLike = {
  isOpen: boolean;
  incr(key: string): Promise<number>;
  expire(key: string, s: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
};

export const hashApiKeyForRateLimit = (key: string): string =>
  crypto.createHash("sha256").update(key).digest("hex");

export function createRateLimiterWithClient(
  client: RedisLike,
  windowMs: number,
  maxRequests: number,
  keyGenerator: (request: FastifyRequest) => string,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!client.isOpen) {
      return;
    }
    try {
      const keyBase = keyGenerator(request);
      if (!keyBase) {
        return;
      }
      const key = `rate:${keyBase}`;
      const current = await client.incr(key);
      if (current === 1) {
        await client.expire(key, Math.ceil(windowMs / 1000));
      }
      if (current > maxRequests) {
        const ttl = await client.ttl(key);
        return reply
          .code(429)
          .send({ error: "rate_limit_exceeded", retryAfter: ttl });
      }
      reply.header("X-RateLimit-Limit", maxRequests.toString());
      reply.header(
        "X-RateLimit-Remaining",
        Math.max(0, maxRequests - current).toString(),
      );
    } catch (err) {
      console.error("Rate limiter error", err);
    }
  };
}

export const createRateLimiter = (
  windowMs: number,
  maxRequests: number,
  keyGenerator: (request: FastifyRequest) => string,
) =>
  createRateLimiterWithClient(redisClient, windowMs, maxRequests, keyGenerator);

export const apiRateLimit = createRateLimiter(
  15 * 60 * 1000,
  100,
  (request) => {
    const apiKey = request.headers["x-api-key"];
    if (apiKey && typeof apiKey === "string") {
      return `apikey:${hashApiKeyForRateLimit(apiKey)}`;
    }
    return `ip:${request.ip}`;
  },
);

export const authRateLimit = createRateLimiter(
  15 * 60 * 1000,
  10,
  (request) => {
    const body = request.body as { email?: string } | undefined;
    const email = body?.email;
    if (email && typeof email === "string") {
      return `email:${email.toLowerCase().trim()}`;
    }
    return `ip:${request.ip}:auth`;
  },
);
