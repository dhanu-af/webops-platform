-- CreateEnum
CREATE TYPE "QcSampleType" AS ENUM ('FINISHED_PRODUCT', 'STABILITY', 'RETENTION', 'INVESTIGATION', 'COMPLAINT');

-- CreateEnum
CREATE TYPE "QcSampleStatus" AS ENUM ('WAITING_COLLECTION', 'COLLECTED', 'WAITING_LAB', 'IN_LABORATORY', 'TESTING', 'WAITING_RESULTS', 'APPROVED', 'REJECTED', 'RETENTION', 'EXPIRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "QcProductCategory" AS ENUM ('CAPSULE', 'GUMMY');

-- CreateEnum
CREATE TYPE "QcTestResult" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "QcAttachmentKind" AS ENUM ('COA', 'LAB_REPORT', 'PHOTO', 'OTHER');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'QC_COLLECTED';
ALTER TYPE "AuditAction" ADD VALUE 'QC_SENT_TO_LAB';
ALTER TYPE "AuditAction" ADD VALUE 'QC_RECEIVED_AT_LAB';
ALTER TYPE "AuditAction" ADD VALUE 'QC_TESTING_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'QC_RESULTS_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'QC_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'QC_MOVED_TO_RETENTION';
ALTER TYPE "AuditAction" ADD VALUE 'QC_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'QC_DISPOSED';
ALTER TYPE "AuditAction" ADD VALUE 'QC_ATTACHMENT_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'QC_ATTACHMENT_REMOVED';

-- CreateTable
CREATE TABLE "QcSample" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "sampleId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "mfgBatchId" TEXT,
    "manufacturingDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "sampleType" "QcSampleType" NOT NULL,
    "productCategory" "QcProductCategory",
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "collectedById" TEXT,
    "collectionDate" TIMESTAMP(3),
    "collectionTime" TEXT,
    "productionRoom" TEXT,
    "sampleStorageLocation" TEXT,
    "storageTemperature" TEXT,
    "storageCondition" TEXT,
    "sentToLab" BOOLEAN NOT NULL DEFAULT false,
    "sentDate" TIMESTAMP(3),
    "courierOrInternal" TEXT,
    "laboratoryName" TEXT,
    "laboratoryLocation" TEXT,
    "receivedByQcId" TEXT,
    "receivedDate" TIMESTAMP(3),
    "status" "QcSampleStatus" NOT NULL DEFAULT 'WAITING_COLLECTION',
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcSampleAttachment" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "kind" "QcAttachmentKind" NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QcSampleAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcLabTest" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "testedById" TEXT,
    "testedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcLabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcLabTestItem" (
    "id" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "result" "QcTestResult",
    "details" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "QcLabTestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcRetentionRecord" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "shelf" TEXT,
    "cabinet" TEXT,
    "boxNumber" TEXT,
    "position" TEXT,
    "quantityRemaining" DOUBLE PRECISION,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "lastChecked" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "destroyDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcRetentionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QcSample_sequence_key" ON "QcSample"("sequence");
CREATE UNIQUE INDEX "QcSample_sampleId_key" ON "QcSample"("sampleId");
CREATE INDEX "QcSample_batchNumber_idx" ON "QcSample"("batchNumber");
CREATE INDEX "QcSample_status_idx" ON "QcSample"("status");
CREATE INDEX "QcSample_sampleType_idx" ON "QcSample"("sampleType");

CREATE INDEX "QcSampleAttachment_sampleId_idx" ON "QcSampleAttachment"("sampleId");

CREATE UNIQUE INDEX "QcLabTest_sampleId_key" ON "QcLabTest"("sampleId");

CREATE INDEX "QcLabTestItem_labTestId_idx" ON "QcLabTestItem"("labTestId");

CREATE UNIQUE INDEX "QcRetentionRecord_sampleId_key" ON "QcRetentionRecord"("sampleId");
CREATE INDEX "QcRetentionRecord_expiryDate_idx" ON "QcRetentionRecord"("expiryDate");

-- AddForeignKey
ALTER TABLE "QcSample" ADD CONSTRAINT "QcSample_mfgBatchId_fkey" FOREIGN KEY ("mfgBatchId") REFERENCES "MfgBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QcSample" ADD CONSTRAINT "QcSample_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QcSample" ADD CONSTRAINT "QcSample_receivedByQcId_fkey" FOREIGN KEY ("receivedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QcSample" ADD CONSTRAINT "QcSample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QcSampleAttachment" ADD CONSTRAINT "QcSampleAttachment_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "QcSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QcSampleAttachment" ADD CONSTRAINT "QcSampleAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QcLabTest" ADD CONSTRAINT "QcLabTest_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "QcSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QcLabTest" ADD CONSTRAINT "QcLabTest_testedById_fkey" FOREIGN KEY ("testedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QcLabTestItem" ADD CONSTRAINT "QcLabTestItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "QcLabTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QcRetentionRecord" ADD CONSTRAINT "QcRetentionRecord_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "QcSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
