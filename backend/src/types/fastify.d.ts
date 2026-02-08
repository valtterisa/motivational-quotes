import type { AuthUser } from "../middleware/auth";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    apiUser?: { id: string; email: string };
    apiKeyId?: string;
  }
}
