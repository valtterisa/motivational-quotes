-- Migration: Better Auth Admin plugin fields
-- user: banned, banReason, banExpires
-- session: impersonatedBy

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banExpires" TIMESTAMPTZ;

ALTER TABLE session ADD COLUMN IF NOT EXISTS "impersonatedBy" TEXT;
