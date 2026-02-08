import type { FastifyRequest, FastifyReply } from "fastify";
import { redisClient } from "../redis/client";

export const createRateLimiter = (
  windowMs: number,
  maxRequests: number,
  keyGenerator: (request: FastifyRequest) => string,
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `rate:${keyGenerator(request)}`;
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, Math.ceil(windowMs / 1000));
    }
    if (current > maxRequests) {
      const ttl = await redisClient.ttl(key);
      return reply
        .code(429)
        .send({ error: "rate_limit_exceeded", retryAfter: ttl });
    }
    reply.header("X-RateLimit-Limit", maxRequests.toString());
    reply.header(
      "X-RateLimit-Remaining",
      Math.max(0, maxRequests - current).toString(),
    );
  };
};

export const apiRateLimit = createRateLimiter(
  15 * 60 * 1000,
  100,
  (request) => {
    const apiKey = request.headers["x-api-key"];
    return apiKey ? `apikey:${apiKey}` : `ip:${request.ip}`;
  },
);

export const authRateLimit = createRateLimiter(
  15 * 60 * 1000,
  10,
  (request) => `ip:${request.ip}`,
);
