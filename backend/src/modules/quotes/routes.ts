import type { Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/drizzle";
import { quotes } from "../../db/schema";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { ApiUserRequest, requireApiKey } from "../../middleware/api-key";
import { and, desc, eq, lt } from "drizzle-orm";

const router = Router();

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

router.get(
  "/quotes/random",
  requireApiKey,
  async (_req: ApiUserRequest, res: Response) => {
    const allRows = await db.select().from(quotes);
    if (allRows.length === 0) {
      return res.status(404).json({ error: "no_quotes" });
    }
    const randomIndex = Math.floor(Math.random() * allRows.length);
    return res.json(allRows[randomIndex]);
  },
);

router.get(
  "/quotes",
  requireApiKey,
  async (req: ApiUserRequest, res: Response) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_query" });
    }
    const { cursor, limit } = parsed.data;
    const pageSize = limit ?? 20;

    let rows;
    if (cursor) {
      rows = await db
        .select()
        .from(quotes)
        .where(lt(quotes.id, cursor))
        .orderBy(desc(quotes.createdAt), desc(quotes.id))
        .limit(pageSize + 1);
    } else {
      rows = await db
        .select()
        .from(quotes)
        .orderBy(desc(quotes.createdAt), desc(quotes.id))
        .limit(pageSize + 1);
    }

    const hasNext = rows.length > pageSize;
    const items = hasNext ? rows.slice(0, pageSize) : rows;
    const nextCursor = hasNext ? items[items.length - 1]?.id : null;

    return res.json({
      items,
      nextCursor,
    });
  },
);

router.get(
  "/dashboard/quotes",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const rows = await db
      .select()
      .from(quotes)
      .where(eq(quotes.createdBy, req.user.id));

    return res.json({ items: rows });
  },
);

router.post(
  "/dashboard/quotes",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const parsed = createQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_body" });
    }

    const [created] = await db
      .insert(quotes)
      .values({
        text: parsed.data.text,
        author: parsed.data.author,
        createdBy: req.user.id,
      })
      .returning();

    return res.status(201).json(created);
  },
);

router.put(
  "/dashboard/quotes/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const { id } = req.params;
    const parsed = updateQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_body" });
    }

    const [updated] = await db
      .update(quotes)
      .set(parsed.data)
      .where(and(eq(quotes.id, id), eq(quotes.createdBy, req.user.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "not_found" });
    }

    return res.json(updated);
  },
);

router.delete(
  "/dashboard/quotes/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const { id } = req.params;

    const [deleted] = await db
      .delete(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.createdBy, req.user.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "not_found" });
    }

    return res.status(204).send();
  },
);

export const quotesRouter = router;

