import { betterAuth } from "better-auth";
import { admin, customSession } from "better-auth/plugins";
import { Pool } from "pg";
import { loadEnv } from "./config/env";

const env = loadEnv();
if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
  throw new Error("BETTER_AUTH_SECRET is required and must be at least 32 characters");
}

const authPool = new Pool({
  connectionString: env.DATABASE_URL,
});

const authConfig = {
  basePath: "/auth",
  trustedOrigins: env.CORS_ORIGINS,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: authPool,
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
  plugins: [
    admin({
      defaultRole: "user",
    }),
    customSession(async ({ user, session }) => {
      let role = "user";
      try {
        const roleResult = await authPool.query<{ role: string }>(
          `SELECT role FROM "user" WHERE id = $1`,
          [user.id]
        );
        role = roleResult.rows[0]?.role ?? "user";
      } catch (e) {
        console.error("[auth] Failed to fetch role for session:", e);
      }
      return {
        user: { ...user, role },
        session,
      };
    }),
  ],
};

export const auth = betterAuth(authConfig);
export { authConfig };
