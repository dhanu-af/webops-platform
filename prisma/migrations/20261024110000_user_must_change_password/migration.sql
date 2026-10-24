-- Admin-issued temporary passwords: the user must replace them at first sign-in.
-- Defaults to false, so every existing account is unaffected.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
