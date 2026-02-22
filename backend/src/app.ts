import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { auth } from "./auth";
import { apiKeysRoutes } from "./modules/api-keys/routes";
import { quotesRoutes } from "./modules/quotes/routes";
import { apiRateLimit, authRateLimit } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error";
import { loadEnv } from "./config/env";

export const createApp = () => {
  const env = loadEnv();
  const app = Fastify({ logger: false, trustProxy: true, bodyLimit: 1024 * 1024 });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    try {
      const parsed = body && body.length > 0 ? JSON.parse(body as string) : {};
      done(null, parsed);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  app.setErrorHandler(errorHandler);

  app.register(helmet);
  app.register(cookie);
  const allowedOrigins = new Set(env.CORS_ORIGINS.map((o) => o.toLowerCase()));
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, false);
      if (allowedOrigins.has(origin.toLowerCase())) return cb(null, true);
      if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-CSRF-Token"],
  });

  const apiBase = process.env.API_PUBLIC_URL ?? `http://localhost:${env.PORT}`;
  app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Motivational Quotes API – Internal",
        description: "Auth, dashboard, feed. Cookie/session auth. Public quote endpoints are on the separate public API service.",
        version: "1.0.0",
      },
      servers: [
        { url: apiBase.replace(/\/$/, ""), description: "API server" },
        { url: "/", description: "Current origin" },
      ],
    },
  });

  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  app.get("/health", {
    schema: {
      tags: ["Health"],
      response: { 200: { type: "object", properties: { ok: { type: "boolean" } } } },
    },
  }, async (_request, reply) => {
    return reply.send({ ok: true });
  });

  const authBaseUrl = env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`;
  app.route({
    method: ["GET", "POST"],
    url: "/auth/*",
    preHandler: authRateLimit,
    async handler(request, reply) {
      try {
        const url = new URL(request.url, authBaseUrl);
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value !== undefined) headers.append(key, Array.isArray(value) ? value.join(", ") : String(value));
        });
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body && Object.keys(request.body as object).length > 0
            ? { body: JSON.stringify(request.body) }
            : {}),
        });
        const response = await auth.handler(req);
        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        reply.send(response.body ? await response.text() : null);
      } catch (error) {
        app.log.error(error, "Authentication error");
        reply.status(500).send({ error: "Internal authentication error", code: "AUTH_FAILURE" });
      }
    },
  });

  app.register(apiKeysRoutes, { prefix: "/dashboard/api-keys" });

  app.register(
    async (instance) => {
      instance.addHook("preHandler", apiRateLimit);
      instance.register(quotesRoutes);
    },
    { prefix: "/api/v1" },
  );

  return app;
};
