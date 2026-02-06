import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./modules/auth/routes";
import { apiKeysRouter } from "./modules/api-keys/routes";
import { quotesRouter } from "./modules/quotes/routes";
import { apiRateLimit, authRateLimit } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error";

export const createApp = () => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: "*",
      credentials: false,
    }),
  );
  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRateLimit, authRouter);
  app.use("/dashboard/api-keys", apiKeysRouter);
  app.use("/api/v1", apiRateLimit, quotesRouter);
  app.use(quotesRouter);

  app.use(errorHandler);

  return app;
};

