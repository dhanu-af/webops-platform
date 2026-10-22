-- AlterEnum
ALTER TYPE "ChecklistCategory" ADD VALUE 'ALLERGEN_CHANGEOVER';

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN "previousProduct" TEXT,
ADD COLUMN "previousBatchNumber" TEXT,
ADD COLUMN "appVersion" TEXT,
ADD COLUMN "reopenReason" TEXT;

-- AlterTable
ALTER TABLE "VerificationRecord" ADD COLUMN "signerName" TEXT,
ADD COLUMN "signerRole" "UserRole",
ADD COLUMN "meaning" TEXT,
ADD COLUMN "passwordReverified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "appVersion" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "fieldName" TEXT,
ADD COLUMN "appVersion" TEXT;

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN "retentionYears" INTEGER NOT NULL DEFAULT 3;
