import type { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../auth";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

function headersFromRequest(request: FastifyRequest): Headers {
  const headers = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (value !== undefined)
      headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  });
  return headers;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const headers = headersFromRequest(request);
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    return reply.code(401).send({ error: "missing_token" });
  }
  const user = session.user as { id: string; email: string; role?: string };
  request.user = {
    id: user.id,
    email: user.email,
    role: user.role ?? "user",
  };
}

export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const headers = headersFromRequest(request);
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return;
  const user = session.user as { id: string; email: string; role?: string };
  request.user = {
    id: user.id,
    email: user.email,
    role: user.role ?? "user",
  };
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.user) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  if (request.user.role !== "admin") {
    return reply.code(403).send({ error: "forbidden" });
  }
}
