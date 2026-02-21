import { createPublicApp } from "./app-public";
import { loadEnv } from "./config/env";
import { redisClientPublic } from "./redis/client-public";

const env = loadEnv();
if (!env.PUBLIC_REDIS_URL) {
  throw new Error("PUBLIC_REDIS_URL is required for public backend");
}

const app = createPublicApp();
const port = env.PUBLIC_API_PORT ?? 3002;

const startServer = async () => {
  try {
    if (!redisClientPublic.isOpen) {
      await redisClientPublic.connect();
    }
  } catch (err) {
    console.error("Redis (public) connection failed, continuing without cache:", err);
  }

  await app.listen({ port, host: "0.0.0.0" });
  console.log(`backend-public listening on http://localhost:${port}`);
};

startServer().catch((err) => {
  console.error("Failed to start public server:", err);
  process.exit(1);
});
