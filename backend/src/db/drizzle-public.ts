import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadEnv } from "../config/env";
import * as schema from "./schema";

const env = loadEnv();

export const poolPublic = new Pool({
  connectionString: env.DATABASE_URL_PUBLIC ?? env.DATABASE_URL,
  max: env.PUBLIC_DB_POOL_MAX ?? 10,
});

export const dbPublic = drizzle(poolPublic, { schema });
