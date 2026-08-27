-- AlterTable
ALTER TABLE "CapsuleCalculation" ADD COLUMN "folderId" TEXT;

-- CreateTable
CREATE TABLE "CalculationFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculationFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalculationFolder_createdAt_idx" ON "CalculationFolder"("createdAt");

CREATE INDEX "CapsuleCalculation_folderId_idx" ON "CapsuleCalculation"("folderId");

-- AddForeignKey
ALTER TABLE "CalculationFolder" ADD CONSTRAINT "CalculationFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CapsuleCalculation" ADD CONSTRAINT "CapsuleCalculation_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "CalculationFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
