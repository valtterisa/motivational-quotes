import { createClient } from "redis";
import { loadEnv } from "../config/env";

const env = loadEnv();

export const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Redis error", err);
});

if (!redisClient.isOpen) {
  redisClient.connect().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to Redis", err);
  });
}

