-- "No production" outcome for a scheduled task: closes it without a checklist.
ALTER TYPE "InspectionStatus" ADD VALUE 'NO_PRODUCTION';
ALTER TABLE "Inspection" ADD COLUMN "noProductionReason" TEXT;
