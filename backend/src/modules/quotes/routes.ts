import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";
import { db, dbRead } from "../../db/drizzle";
import { quotes } from "../../db/schema";
import { redisClient } from "../../redis/client";
import { requireAuth } from "../../middleware/auth";
import { requireApiKey } from "../../middleware/api-key";
import { and, desc, eq, lt } from "drizzle-orm";

const RANDOM_QUOTE_CACHE_KEY = "quotes:random";
const RANDOM_QUOTE_CACHE_TTL_SEC = 60;

const createQuoteSchema = z.object({
  text: z.string().min(1),
  author: z.string().optional(),
});

const updateQuoteSchema = createQuoteSchema.partial();

const listQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z
    .string()
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n > 0 && n <= 100)
    .optional(),
});

export async function quotesRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  fastify.get(
    "/quotes/random",
    { preHandler: [requireApiKey] },
    async (_request, reply) => {
      if (redisClient.isOpen) {
        try {
          const cached = await redisClient.get(RANDOM_QUOTE_CACHE_KEY);
          if (cached) {
            return reply.send(JSON.parse(cached) as unknown);
          }
        } catch {
          // ignore cache errors, fall through to DB
        }
      }

      const allRows = await dbRead.select().from(quotes);
      if (allRows.length === 0) {
        return reply.code(404).send({ error: "no_quotes" });
      }
      const randomIndex = Math.floor(Math.random() * allRows.length);
      const quote = allRows[randomIndex];

      if (redisClient.isOpen) {
        try {
          await redisClient.set(
            RANDOM_QUOTE_CACHE_KEY,
            JSON.stringify(quote),
            { EX: RANDOM_QUOTE_CACHE_TTL_SEC },
          );
        } catch {
          // ignore
        }
      }

      return reply.send(quote);
    },
  );

  fastify.get("/feed", async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }
    const { cursor, limit } = parsed.data;
    const pageSize = limit ?? 20;

    let rows;
    if (cursor) {
      rows = await dbRead
        .select()
        .from(quotes)
        .where(lt(quotes.id, cursor))
        .orderBy(desc(quotes.createdAt), desc(quotes.id))
        .limit(pageSize + 1);
    } else {
      rows = await dbRead
        .select()
        .from(quotes)
        .orderBy(desc(quotes.createdAt), desc(quotes.id))
        .limit(pageSize + 1);
    }

    const hasNext = rows.length > pageSize;
    const items = hasNext ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasNext ? items[items.length - 1]?.id ?? null : null;

    return reply.send({ items, nextCursor });
  });

  fastify.get(
    "/quotes",
    { preHandler: [requireApiKey] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_query" });
      }
      const { cursor, limit } = parsed.data;
      const pageSize = limit ?? 20;

      let rows;
      if (cursor) {
        rows = await dbRead
          .select()
          .from(quotes)
          .where(lt(quotes.id, cursor))
          .orderBy(desc(quotes.createdAt), desc(quotes.id))
          .limit(pageSize + 1);
      } else {
        rows = await dbRead
          .select()
          .from(quotes)
          .orderBy(desc(quotes.createdAt), desc(quotes.id))
          .limit(pageSize + 1);
      }

      const hasNext = rows.length > pageSize;
      const items = hasNext ? rows.slice(0, pageSize) : rows;
      const nextCursor = hasNext ? items[items.length - 1]?.id ?? null : null;

      return reply.send({ items, nextCursor });
    },
  );

  fastify.get(
    "/dashboard/quotes",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: "unauthorized" });
      }

      const rows = await dbRead
        .select()
        .from(quotes)
        .where(eq(quotes.createdBy, request.user.id));

      return reply.send({ items: rows });
    },
  );

  fastify.post(
    "/dashboard/quotes",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: "unauthorized" });
      }

      const parsed = createQuoteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body" });
      }

      const [created] = await db
        .insert(quotes)
        .values({
          text: parsed.data.text,
          author: parsed.data.author,
          createdBy: request.user.id,
        })
        .returning();

      return reply.code(201).send(created);
    },
  );

  fastify.put(
    "/dashboard/quotes/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: "unauthorized" });
      }

      const rawId = (request.params as { id?: string }).id;
      const id = typeof rawId === "string" ? rawId : rawId?.[0];
      if (!id) {
        return reply.code(400).send({ error: "invalid_id" });
      }
      const parsed = updateQuoteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body" });
      }

      const [updated] = await db
        .update(quotes)
        .set(parsed.data)
        .where(
          and(
            eq(quotes.id, id),
            eq(quotes.createdBy, request.user.id),
          ),
        )
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "not_found" });
      }

      return reply.send(updated);
    },
  );

  fastify.delete(
    "/dashboard/quotes/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: "unauthorized" });
      }

      const rawId = (request.params as { id?: string }).id;
      const id = typeof rawId === "string" ? rawId : rawId?.[0];
      if (!id) {
        return reply.code(400).send({ error: "invalid_id" });
      }

      const [deleted] = await db
        .delete(quotes)
        .where(
          and(
            eq(quotes.id, id),
            eq(quotes.createdBy, request.user.id),
          ),
        )
        .returning();

      if (!deleted) {
        return reply.code(404).send({ error: "not_found" });
      }

      return reply.code(204).send();
    },
  );
}
