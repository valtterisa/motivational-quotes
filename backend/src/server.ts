import { config } from "dotenv";
import { join } from "path";
import { getMigrations } from "better-auth/db";
import { createApp } from "./app";
import { authConfig } from "./auth";
import { loadEnv } from "./config/env";
import { ensureAdminByEmail } from "./db/ensure-admin";
import { runMigrations } from "./db/migrate";
import { redisClient } from "./redis/client";
import { runSeedIfEmpty } from "./seed";

config({ path: join(process.cwd(), ".env") });
config({ path: join(process.cwd(), "..", ".env") });

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

  if (env.ADMIN_EMAIL?.trim()) {
    try {
      // eslint-disable-next-line no-console
      console.log("[ensure-admin] Running for ADMIN_EMAIL:", env.ADMIN_EMAIL.trim());
      await ensureAdminByEmail(env.ADMIN_EMAIL.trim());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Ensure admin failed (continuing):", err);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("[ensure-admin] Skipped: ADMIN_EMAIL not set in .env");
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
