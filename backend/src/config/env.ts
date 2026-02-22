export interface Env {
  PORT: number;
  DATABASE_URL: string;
  DB_POOL_MAX?: number;
  REDIS_URL: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CORS_ORIGINS: string[];
  MONGODB_URI: string;
  PUBLIC_API_PORT?: number;
  PUBLIC_REDIS_URL?: string;
  PUBLIC_DB_POOL_MAX?: number;
  DATABASE_URL_PUBLIC?: string;
  MONGODB_URI_PUBLIC?: string;
  PUBLIC_API_BASE_URL?: string;
  TRUST_PROXY: boolean;
}

export const loadEnv = (): Env => {
  const {
    PORT = "3001",
    DATABASE_URL,
    DB_POOL_MAX,
    REDIS_URL = "redis://localhost:6379",
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    CORS_ORIGINS = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
    MONGODB_URI,
    PUBLIC_API_PORT = "3002",
    PUBLIC_REDIS_URL,
    PUBLIC_DB_POOL_MAX,
    DATABASE_URL_PUBLIC,
    MONGODB_URI_PUBLIC,
    PUBLIC_API_BASE_URL,
    TRUST_PROXY,
  } = process.env;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  return {
    PORT: Number(PORT),
    DATABASE_URL,
    DB_POOL_MAX: DB_POOL_MAX != null ? Number(DB_POOL_MAX) : undefined,
    REDIS_URL,
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    CORS_ORIGINS: CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    MONGODB_URI,
    PUBLIC_API_PORT:
      PUBLIC_API_PORT != null ? Number(PUBLIC_API_PORT) : undefined,
    PUBLIC_REDIS_URL: PUBLIC_REDIS_URL ?? undefined,
    PUBLIC_DB_POOL_MAX:
      PUBLIC_DB_POOL_MAX != null ? Number(PUBLIC_DB_POOL_MAX) : undefined,
    DATABASE_URL_PUBLIC: DATABASE_URL_PUBLIC ?? undefined,
    MONGODB_URI_PUBLIC: MONGODB_URI_PUBLIC ?? undefined,
    PUBLIC_API_BASE_URL: PUBLIC_API_BASE_URL ?? undefined,
    TRUST_PROXY: /^(1|true|yes)$/i.test(TRUST_PROXY ?? ""),
  };
};
