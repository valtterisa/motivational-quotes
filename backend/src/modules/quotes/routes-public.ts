import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";
import { redisClientPublic } from "../../redis/client-public";
import { requireApiKeyPublic } from "../../middleware/api-key-public";
import { getContentDbPublic } from "../../store/client-public";
import * as content from "../../store/content";

const RANDOM_QUOTE_CACHE_KEY = "quotes:random";
const RANDOM_QUOTE_CACHE_TTL_SEC = 60;
const BY_AUTHOR_CACHE_TTL_SEC = 300;
const BY_AUTHOR_CACHE_PREFIX = "quotes:by_author:";

const listQuerySchema = z.object({
  author: z.string().min(1).max(500).transform((s) => s.trim()).optional(),
  cursor: z.string().uuid().optional(),
  limit: z
    .string()
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n > 0 && n <= 100)
    .optional(),
});

const getDbPublic = () => getContentDbPublic();

export async function quotesRoutesPublic(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  const quoteSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      text: { type: "string" },
      author: { type: ["string", "null"] },
      createdBy: { type: ["string", "null"] },
      createdAt: { type: "string" },
      updatedAt: { type: ["string", "null"] },
    },
  };

  fastify.get("/quotes/random", {
    preHandler: [requireApiKeyPublic],
    schema: {
      tags: ["Quotes"],
      description: "Random quote. X-API-Key required.",
      response: { 200: quoteSchema, 404: { type: "object", properties: { error: { type: "string" } } } },
    },
  }, async (_request, reply) => {
    if (redisClientPublic.isOpen) {
      try {
        const cached = await redisClientPublic.get(RANDOM_QUOTE_CACHE_KEY);
        if (cached) return reply.send(JSON.parse(cached) as unknown);
      } catch {
        // ignore
      }
    }
    const quote = await content.getRandomQuote(getDbPublic);
    if (!quote) return reply.code(404).send({ error: "no_quotes" });
    if (redisClientPublic.isOpen) {
      try {
        await redisClientPublic.set(RANDOM_QUOTE_CACHE_KEY, JSON.stringify(quote), { EX: RANDOM_QUOTE_CACHE_TTL_SEC });
      } catch {
        // ignore
      }
    }
    return reply.send(quote);
  });

  fastify.get("/quotes", {
    preHandler: [requireApiKeyPublic],
    schema: {
      tags: ["Quotes"],
      description: "List quotes (author/cursor/limit). X-API-Key required.",
      querystring: {
        type: "object",
        properties: {
          author: { type: "string", minLength: 1, maxLength: 500 },
          cursor: { type: "string", format: "uuid" },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
      response: {
        200: { type: "object", properties: { items: { type: "array", items: quoteSchema }, nextCursor: { type: ["string", "null"] } } },
        400: { type: "object", properties: { error: { type: "string" } } },
        404: { type: "object", properties: { error: { type: "string" } } },
      },
    },
  }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_query" });
    const { author, cursor, limit } = parsed.data;
    const pageSize = limit ?? 20;
    if (author != null && redisClientPublic.isOpen) {
      try {
        const cacheKey = `${BY_AUTHOR_CACHE_PREFIX}${encodeURIComponent(author)}:${cursor ?? ""}:${pageSize}`;
        const cached = await redisClientPublic.get(cacheKey);
        if (cached) return reply.send(JSON.parse(cached) as { items: unknown[]; nextCursor: string | null });
      } catch {
        // fall through
      }
    }
    const { items, nextCursor } = await content.listQuotes({ author: author ?? undefined, cursor: cursor ?? undefined, limit: pageSize }, getDbPublic);
    const payload = { items, nextCursor };
    if (author != null && redisClientPublic.isOpen) {
      try {
        const cacheKey = `${BY_AUTHOR_CACHE_PREFIX}${encodeURIComponent(author)}:${cursor ?? ""}:${pageSize}`;
        await redisClientPublic.set(cacheKey, JSON.stringify(payload), { EX: BY_AUTHOR_CACHE_TTL_SEC });
      } catch {
        // ignore
      }
    }
    if (author != null && items.length === 0) return reply.code(404).send({ error: "no_quotes_for_author" });
    return reply.send(payload);
  });
}
