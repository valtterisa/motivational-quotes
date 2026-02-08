import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";

export const errorHandler = (
  err: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
) => {
  // eslint-disable-next-line no-console
  console.error("Error:", err);
  reply.code(500).send({ error: "internal_server_error" });
};
