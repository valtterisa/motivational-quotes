import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../db/drizzle";
import { users } from "../../db/schema";
import { signAccessToken, requireAuth } from "../../middleware/auth";
import { eq } from "drizzle-orm";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const COOKIE_MAX_AGE = 60 * 60;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
};

export async function authRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  fastify.post("/signup", async (request, reply) => {
    const result = authSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }

    const { email, password } = result.data;

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      return reply.code(409).send({ error: "email_in_use" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [created] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning();

    const token = signAccessToken({
      id: created.id,
      email: created.email,
      role: created.role,
    });

    reply.setCookie("access_token", token, COOKIE_OPTIONS);

    return reply.code(201).send({
      user: { id: created.id, email: created.email, role: created.role },
      token,
    });
  });

  fastify.post("/login", async (request, reply) => {
    const result = authSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }

    const { email, password } = result.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    reply.setCookie("access_token", token, COOKIE_OPTIONS);

    return reply.send({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  });

  fastify.get("/me", { preHandler: [requireAuth] }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    return reply.send({
      user: {
        id: request.user.id,
        email: request.user.email,
        role: request.user.role,
      },
    });
  });

  fastify.post(
    "/logout",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      reply.clearCookie("access_token", {
        path: COOKIE_OPTIONS.path,
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
      });
      return reply.send({ success: true });
    },
  );
}
