-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DELETED';

-- CreateEnum
CREATE TYPE "CalculationDirection" AS ENUM ('BOTTLES_TO_KG', 'KG_TO_OUTPUT', 'BAGGED_KG_TO_OUTPUT');

-- CreateTable
CREATE TABLE "CapsuleCalculation" (
    "id" TEXT NOT NULL,
    "direction" "CalculationDirection" NOT NULL,
    "label" TEXT,
    "capsulesPerBottle" INTEGER NOT NULL,
    "avgWeightMg" DOUBLE PRECISION NOT NULL,
    "inputValue" DOUBLE PRECISION NOT NULL,
    "resultKg" DOUBLE PRECISION NOT NULL,
    "resultCapsules" DOUBLE PRECISION NOT NULL,
    "resultBottles" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapsuleCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapsuleCalculation_createdAt_idx" ON "CapsuleCalculation"("createdAt");

-- AddForeignKey
ALTER TABLE "CapsuleCalculation" ADD CONSTRAINT "CapsuleCalculation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
