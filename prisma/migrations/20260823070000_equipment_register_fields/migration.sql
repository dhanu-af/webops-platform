-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN "manufacturerModel" TEXT,
ADD COLUMN "criticality" TEXT,
ADD COLUMN "foodSafetyRisk" BOOLEAN,
ADD COLUMN "ppmFrequency" TEXT,
ADD COLUMN "serviceProvider" TEXT,
ADD COLUMN "status" TEXT,
ADD COLUMN "lastServiceDate" TEXT,
ADD COLUMN "nextServiceDue" TEXT,
ADD COLUMN "validationStatus" TEXT,
ADD COLUMN "comments" TEXT;
