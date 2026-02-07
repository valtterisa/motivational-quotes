import type { Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/drizzle";
import { apiKeys } from "../../db/schema";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { generateApiKey } from "../../middleware/api-key";
import { and, eq } from "drizzle-orm";

const router = Router();

const createSchema = z.object({
  label: z.string().min(1),
});

router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, req.user.id));

    return res.json({
      keys: rows.map((k) => ({
        id: k.id,
        label: k.label,
        createdAt: k.createdAt,
        revokedAt: k.revokedAt,
      })),
    });
  },
);

router.post(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const result = createSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "invalid_body" });
    }

    const { label } = result.data;
    const { raw, hash } = generateApiKey();

    const [created] = await db
      .insert(apiKeys)
      .values({
        userId: req.user.id,
        keyHash: hash,
        label,
      })
      .returning();

    return res.status(201).json({
      key: {
        id: created.id,
        label: created.label,
        createdAt: created.createdAt,
      },
      token: raw,
    });
  },
);

router.post(
  "/:id/revoke",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : rawId?.[0];
    if (!id) {
      return res.status(400).json({ error: "invalid_id" });
    }

    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, req.user.id)));

    return res.json({ success: true });
  },
);

export const apiKeysRouter = router;

