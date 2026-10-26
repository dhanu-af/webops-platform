-- Shop-floor PIN sign-in on registered iPads. Additive only: nothing existing changes.
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_FAILED';

ALTER TABLE "User" ADD COLUMN "pinHash" TEXT,
ADD COLUMN "pinMustChange" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pinSetAt" TIMESTAMP(3),
ADD COLUMN "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pinLockedUntil" TIMESTAMP(3);

CREATE TABLE "KioskDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT,
    "setupCodeHash" TEXT,
    "setupExpiresAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KioskDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KioskDevice_tokenHash_key" ON "KioskDevice"("tokenHash");
CREATE UNIQUE INDEX "KioskDevice_setupCodeHash_key" ON "KioskDevice"("setupCodeHash");

ALTER TABLE "KioskDevice" ADD CONSTRAINT "KioskDevice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
