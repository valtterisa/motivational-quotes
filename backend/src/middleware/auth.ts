import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { loadEnv } from "../config/env";
import { redisClient } from "../redis/client";

const env = loadEnv();

export interface AuthUser {
  id: string;
  email: string;
  role: string;
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
    { id: user.id, email: user.email, role: user.role, jti },
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
  // Try to get token from cookie first, then fall back to Authorization header
  let token = req.cookies?.access_token;
  
  if (!token) {
    const header = req.header("authorization");
    if (header?.startsWith("Bearer ")) {
      token = header.slice("Bearer ".length);
    }
  }

  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
      return res.status(401).json({ error: "token_revoked" });
    }

    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
};

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  return next();
};

