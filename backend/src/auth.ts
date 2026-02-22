import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { loadEnv } from "./config/env";

const env = loadEnv();
if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
  throw new Error("BETTER_AUTH_SECRET is required and must be at least 32 characters");
}

const authConfig = {
  basePath: "/auth",
  trustedOrigins: env.CORS_ORIGINS,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: new Pool({
    connectionString: env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string" as const,
        defaultValue: "user",
        input: false,
      },
    },
  },
};

export const auth = betterAuth(authConfig);
export { authConfig };
