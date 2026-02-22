import { getMigrations } from "better-auth/db";
import { createApp } from "./app";
import { authConfig } from "./auth";
import { loadEnv } from "./config/env";
import { runMigrations } from "./db/migrate";
import { redisClient } from "./redis/client";
import { runSeedIfEmpty } from "./seed";

const env = loadEnv();
if (!env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required for internal backend");
}
const app = createApp();

const startServer = async () => {
  try {
    const { runMigrations: runAuthMigrations } = await getMigrations(authConfig);
    await runAuthMigrations();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Better Auth migrations failed:", err);
    process.exit(1);
  }
  try {
    await runMigrations();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Migrations failed:", err);
    process.exit(1);
  }

  try {
    await runSeedIfEmpty();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Seed failed (continuing):", err);
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Redis connection failed, continuing without cache:", err);
  }

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`backend listening on http://localhost:${env.PORT}`);
};

startServer().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});
