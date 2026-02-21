import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { quotesRoutesPublic } from "./modules/quotes/routes-public";
import { createRateLimiterWithClient } from "./middleware/rate-limit";
import { redisClientPublic } from "./redis/client-public";
import { errorHandler } from "./middleware/error";
import { loadEnv } from "./config/env";

export const createPublicApp = () => {
  const env = loadEnv();
  const app = Fastify({
    logger: false,
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        const parsed =
          body && body.length > 0 ? JSON.parse(body as string) : {};
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.setErrorHandler(errorHandler);

  app.register(helmet);
  app.register(cors, {
    origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true,
    credentials: false,
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-Key"],
  });

  const apiBase =
    env.PUBLIC_API_BASE_URL ??
    process.env.API_PUBLIC_URL ??
    `http://localhost:${env.PUBLIC_API_PORT ?? 3002}`;
  app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Motivational Quotes API – Public",
        description:
          "Public API for quotes. Authenticate with X-API-Key header.",
        version: "1.0.0",
      },
      servers: [
        { url: apiBase.replace(/\/$/, ""), description: "Public API" },
        { url: "/", description: "Current origin" },
      ],
    },
  });

  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        response: {
          200: { type: "object", properties: { ok: { type: "boolean" } } },
        },
      },
    },
    async (_request, reply) => {
      return reply.send({ ok: true });
    },
  );

  const publicApiRateLimit = createRateLimiterWithClient(
    redisClientPublic,
    15 * 60 * 1000,
    100,
    (request) => {
      const apiKey = request.headers["x-api-key"];
      return apiKey ? `apikey:${apiKey}` : `ip:${request.ip}`;
    },
  );

  app.register(
    async (instance) => {
      instance.addHook("preHandler", publicApiRateLimit);
      instance.register(quotesRoutesPublic);
    },
    { prefix: "/api/v1" },
  );

  return app;
};
