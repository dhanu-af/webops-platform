-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "sectionId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
