import { createClient } from "redis";
import { loadEnv } from "../config/env";

const env = loadEnv();

if (!env.PUBLIC_REDIS_URL) {
  throw new Error("PUBLIC_REDIS_URL is required for public backend");
}

export const redisClientPublic = createClient({
  url: env.PUBLIC_REDIS_URL,
});

redisClientPublic.on("error", (err) => {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
    console.error("Redis (public) error", err);
  }
});
