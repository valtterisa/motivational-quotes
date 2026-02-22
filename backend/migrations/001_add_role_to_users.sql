-- Migration: Add role field to user table (Better Auth)
-- Description: Adds RBAC support by adding a role field to the user table

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

UPDATE "user" SET role = 'user' WHERE role IS NULL OR role = '';
