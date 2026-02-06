import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { loadEnv } from "../config/env";
import { redisClient } from "../redis/client";

const env = loadEnv();

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface TokenPayload extends AuthUser {
  jti: string;
}

export const signAccessToken = (user: AuthUser): string => {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { id: user.id, email: user.email, jti },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );
};

export const blacklistToken = async (jti: string, ttlSeconds: number) => {
  const key = `jwt:blacklist:${jti}`;
  await redisClient.set(key, "1", { EX: ttlSeconds });
};

export const isTokenBlacklisted = async (jti: string): Promise<boolean> => {
  const key = `jwt:blacklist:${jti}`;
  const val = await redisClient.get(key);
  return val === "1";
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
      return res.status(401).json({ error: "token_revoked" });
    }

    req.user = { id: decoded.id, email: decoded.email };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
};

