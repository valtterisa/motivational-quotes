import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { count } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { apiKeys } from "../../db/schema";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import * as content from "../../store/content";

export async function adminRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  fastify.get(
    "/admin/stats",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        tags: ["Admin"],
        response: {
          200: {
            type: "object",
            properties: {
              quoteCountByUserId: {
                type: "object",
                additionalProperties: { type: "number" },
              },
              apiKeyCountByUserId: {
                type: "object",
                additionalProperties: { type: "number" },
              },
            },
          },
          401: { type: "object", properties: { error: { type: "string" } } },
          403: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (_request, reply) => {
      const [quoteCountByUserId, apiKeyRows] = await Promise.all([
        content.getQuoteCountByUserId(),
        db
          .select({ userId: apiKeys.userId, count: count() })
          .from(apiKeys)
          .groupBy(apiKeys.userId),
      ]);
      const apiKeyCountByUserId: Record<string, number> = {};
      for (const r of apiKeyRows) {
        apiKeyCountByUserId[r.userId] = Number(r.count);
      }
      return reply.send({
        quoteCountByUserId,
        apiKeyCountByUserId,
      });
    },
  );
}
