import type { FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";
import { db } from "../db/drizzle";
import { apiKeys, users } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";

const hashKey = (key: string) =>
  crypto.createHash("sha256").update(key).digest("hex");

export const requireApiKey = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const rawKey = request.headers["x-api-key"];
  if (!rawKey || typeof rawKey !== "string") {
    return reply.code(401).send({ error: "missing_api_key" });
  }

  const keyHash = hashKey(rawKey);

  const row = await db
    .select({
      apiKeyId: apiKeys.id,
      userId: apiKeys.userId,
      email: users.email,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  const match = row[0];
  if (!match) {
    return reply.code(401).send({ error: "invalid_api_key" });
  }

  request.apiUser = { id: match.userId, email: match.email };
  request.apiKeyId = match.apiKeyId;
};

export const generateApiKey = () => {
  const raw = `mot_${crypto.randomBytes(24).toString("hex")}`;
  return { raw, hash: hashKey(raw) };
};
