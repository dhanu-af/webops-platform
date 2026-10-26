-- The PIN alone now identifies the person, so each PIN is findable (keyed hash) and unique, and wrong PINs are counted
-- per network and overall. Additive, apart from clearing PINs issued before this change (they cannot be used with
-- the new sign-in and must be issued again; none had been in real use).
ALTER TABLE "User" ADD COLUMN "pinLookup" TEXT;
CREATE UNIQUE INDEX "User_pinLookup_key" ON "User"("pinLookup");
UPDATE "User" SET "pinHash" = NULL, "pinMustChange" = false, "pinFailedAttempts" = 0, "pinLockedUntil" = NULL WHERE "pinHash" IS NOT NULL;

CREATE TABLE "PinAttempt" (
    "id" TEXT NOT NULL,
    "net" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PinAttempt_net_createdAt_idx" ON "PinAttempt"("net", "createdAt");
CREATE INDEX "PinAttempt_createdAt_idx" ON "PinAttempt"("createdAt");
