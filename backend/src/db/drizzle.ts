import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadEnv } from "../config/env";
import * as schema from "./schema";

const env = loadEnv();

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
});

export const db = drizzle(pool, { schema });

const readUrl = env.DATABASE_READ_URL ?? env.DATABASE_URL;
export const poolRead =
  readUrl === env.DATABASE_URL
    ? pool
    : new Pool({
        connectionString: readUrl,
        max: env.DB_POOL_MAX,
      });

export const dbRead = drizzle(poolRead, { schema });

