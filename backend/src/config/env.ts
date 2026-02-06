export interface Env {
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
}

export const loadEnv = (): Env => {
  const {
    PORT = "3001",
    DATABASE_URL,
    REDIS_URL = "redis://localhost:6379",
    JWT_SECRET,
  } = process.env;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  return {
    PORT: Number(PORT),
    DATABASE_URL,
    REDIS_URL,
    JWT_SECRET,
  };
};

