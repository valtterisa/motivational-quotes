import type { Request, Response } from "express";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../db/drizzle";
import { users } from "../../db/schema";
import { signAccessToken, requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { eq } from "drizzle-orm";

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 1000, // 1 hour
};

router.post("/signup", async (req: Request, res: Response) => {
  const result = authSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "invalid_body" });
  }

  const { email, password } = result.data;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return res.status(409).json({ error: "email_in_use" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [created] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning();

  const token = signAccessToken({ id: created.id, email: created.email, role: created.role });

  // Set HTTP-only cookie
  res.cookie("access_token", token, COOKIE_OPTIONS);

  return res.status(201).json({
    user: { id: created.id, email: created.email, role: created.role },
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const result = authSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "invalid_body" });
  }

  const { email, password } = result.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = signAccessToken({ id: user.id, email: user.email, role: user.role });

  // Set HTTP-only cookie
  res.cookie("access_token", token, COOKIE_OPTIONS);

  return res.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  return res.json({
    user: { id: req.user.id, email: req.user.email, role: req.user.role },
  });
});

router.post("/logout", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  // Clear the cookie
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  });

  return res.json({ success: true });
});

export const authRouter = router;

