import type { FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";
import { dbPublic } from "../db/drizzle-public";
import { apiKeys, users } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";

const hashKey = (key: string) =>
  crypto.createHash("sha256").update(key).digest("hex");

export const requireApiKeyPublic = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const rawKey = request.headers["x-api-key"];
  if (!rawKey || typeof rawKey !== "string") {
    return reply.code(401).send({ error: "missing_api_key" });
  }

  const keyHash = hashKey(rawKey);

  const row = await dbPublic
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
