-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'TEAM_LEADER', 'SUPERVISOR', 'QA', 'MANAGEMENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "WorkflowRole" AS ENUM ('OPERATOR', 'TEAM_LEADER', 'SUPERVISOR', 'QA');

-- CreateEnum
CREATE TYPE "ChecklistCategory" AS ENUM ('PRE_START', 'POST_OPERATION_CLEANING', 'FIVE_S', 'EQUIPMENT_CHECK', 'FACILITY_INSPECTION', 'WAREHOUSE_INSPECTION', 'PER_SHIFT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('PER_SHIFT', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'AD_HOC', 'BEFORE_PRODUCTION', 'AFTER_PRODUCTION', 'AFTER_CLEANING', 'AFTER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PASS_FAIL', 'YES_NO', 'NA', 'NUMERIC', 'TEXT', 'PHOTO', 'MULTIPLE_CHOICE', 'ACKNOWLEDGEMENT');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AWAITING_SUPERVISOR', 'SUPERVISOR_APPROVED', 'AWAITING_QA', 'QA_APPROVED', 'CLOSED', 'RETURNED', 'REJECTED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ResponseValue" AS ENUM ('PASS', 'FAIL', 'NA');

-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('GENERAL', 'BEFORE', 'AFTER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'CORRECTIVE_ACTION_CREATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CorrectiveActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'AWAITING_VERIFICATION', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "VerificationAction" AS ENUM ('APPROVE', 'RETURN', 'REJECT');

-- CreateEnum
CREATE TYPE "AreaReleaseStatus" AS ENUM ('NOT_RELEASED', 'AWAITING_SUPERVISOR', 'AWAITING_QA', 'QA_RELEASED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHECK_DUE', 'CHECK_OVERDUE', 'SUPERVISOR_VERIFICATION_REQUIRED', 'QA_VERIFICATION_REQUIRED', 'CORRECTIVE_ACTION_DUE', 'CORRECTIVE_ACTION_OVERDUE', 'RETURNED', 'REJECTED', 'AREA_RELEASED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'STARTED', 'EDITED', 'SUBMITTED', 'ITEM_FAILED', 'PHOTO_UPLOADED', 'FINDING_CREATED', 'CORRECTIVE_ACTION_CREATED', 'SUPERVISOR_REVIEWED', 'SUPERVISOR_APPROVED', 'RETURNED', 'REJECTED', 'QA_REVIEWED', 'QA_APPROVED', 'CLOSED', 'AREA_RELEASED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "employeeId" TEXT,
    "role" "UserRole" NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Brisbane',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "qrToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serialNumber" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "qrToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationWorkflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresAreaRelease" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "WorkflowRole" NOT NULL,

    CONSTRAINT "VerificationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ChecklistCategory" NOT NULL,
    "description" TEXT,
    "workflowId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistVersion" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChecklistVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistVersionId" TEXT NOT NULL,
    "groupLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT NOT NULL,
    "helpText" TEXT,
    "type" "ItemType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "choices" JSONB,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "requiresPhotoOnFail" BOOLEAN NOT NULL DEFAULT false,
    "criticalFailure" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistSchedule" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dueTime" TEXT,
    "dueWindowMins" INTEGER NOT NULL DEFAULT 120,
    "recurrenceDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "facilityId" TEXT NOT NULL,
    "sectionId" TEXT,
    "areaId" TEXT,
    "equipmentId" TEXT,
    "assignedRole" "UserRole",
    "assignedUserId" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "photoRequired" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "checklistVersionId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "facilityId" TEXT NOT NULL,
    "sectionId" TEXT,
    "areaId" TEXT,
    "equipmentId" TEXT,
    "frequency" "Frequency" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "shift" TEXT,
    "product" TEXT,
    "batchNumber" TEXT,
    "status" "InspectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "score" DOUBLE PRECISION,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "operatorId" TEXT,
    "supervisorId" TEXT,
    "qaId" TEXT,
    "returnedReason" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionResponse" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "passFail" "ResponseValue",
    "numericValue" DOUBLE PRECISION,
    "textValue" TEXT,
    "choiceValue" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoEvidence" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT,
    "responseId" TEXT,
    "findingId" TEXT,
    "correctiveActionId" TEXT,
    "areaId" TEXT,
    "equipmentId" TEXT,
    "kind" "PhotoKind" NOT NULL DEFAULT 'GENERAL',
    "storagePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "caption" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "responseId" TEXT,
    "checklistItemId" TEXT,
    "areaId" TEXT,
    "equipmentId" TEXT,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "severity" "Severity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "immediateCorrection" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "areaId" TEXT,
    "equipmentId" TEXT,
    "rootCause" TEXT,
    "immediateCorrection" TEXT,
    "correctiveAction" TEXT NOT NULL,
    "preventiveAction" TEXT,
    "responsibleUserId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CorrectiveActionStatus" NOT NULL DEFAULT 'OPEN',
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "stepRole" "WorkflowRole" NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "VerificationAction" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaRelease" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "status" "AreaReleaseStatus" NOT NULL DEFAULT 'NOT_RELEASED',
    "supervisorId" TEXT,
    "supervisorAt" TIMESTAMP(3),
    "qaId" TEXT,
    "qaAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "inspectionId" TEXT,
    "action" "AuditAction" NOT NULL,
    "userId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_code_key" ON "Facility"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Section_facilityId_code_key" ON "Section"("facilityId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Area_qrToken_key" ON "Area"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Area_sectionId_code_key" ON "Area"("sectionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_qrToken_key" ON "Equipment"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_areaId_code_key" ON "Equipment"("areaId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationStep_workflowId_order_key" ON "VerificationStep"("workflowId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistVersion_checklistId_versionNumber_key" ON "ChecklistVersion"("checklistId", "versionNumber");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistVersionId_idx" ON "ChecklistItem"("checklistVersionId");

-- CreateIndex
CREATE INDEX "ChecklistSchedule_facilityId_active_idx" ON "ChecklistSchedule"("facilityId", "active");

-- CreateIndex
CREATE INDEX "Inspection_facilityId_status_idx" ON "Inspection"("facilityId", "status");

-- CreateIndex
CREATE INDEX "Inspection_areaId_status_idx" ON "Inspection"("areaId", "status");

-- CreateIndex
CREATE INDEX "Inspection_dueAt_idx" ON "Inspection"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionResponse_inspectionId_checklistItemId_key" ON "InspectionResponse"("inspectionId", "checklistItemId");

-- CreateIndex
CREATE INDEX "PhotoEvidence_inspectionId_idx" ON "PhotoEvidence"("inspectionId");

-- CreateIndex
CREATE INDEX "PhotoEvidence_areaId_idx" ON "PhotoEvidence"("areaId");

-- CreateIndex
CREATE INDEX "PhotoEvidence_findingId_idx" ON "PhotoEvidence"("findingId");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_responseId_key" ON "Finding"("responseId");

-- CreateIndex
CREATE INDEX "Finding_areaId_status_idx" ON "Finding"("areaId", "status");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveAction_findingId_key" ON "CorrectiveAction"("findingId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_status_dueDate_idx" ON "CorrectiveAction"("status", "dueDate");

-- CreateIndex
CREATE INDEX "VerificationRecord_inspectionId_idx" ON "VerificationRecord"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaRelease_inspectionId_key" ON "AreaRelease"("inspectionId");

-- CreateIndex
CREATE INDEX "AreaRelease_areaId_status_idx" ON "AreaRelease"("areaId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_inspectionId_idx" ON "AuditLog"("inspectionId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationStep" ADD CONSTRAINT "VerificationStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "VerificationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "VerificationWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistVersion" ADD CONSTRAINT "ChecklistVersion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistVersion" ADD CONSTRAINT "ChecklistVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistVersionId_fkey" FOREIGN KEY ("checklistVersionId") REFERENCES "ChecklistVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSchedule" ADD CONSTRAINT "ChecklistSchedule_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSchedule" ADD CONSTRAINT "ChecklistSchedule_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSchedule" ADD CONSTRAINT "ChecklistSchedule_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSchedule" ADD CONSTRAINT "ChecklistSchedule_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSchedule" ADD CONSTRAINT "ChecklistSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSchedule" ADD CONSTRAINT "ChecklistSchedule_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_checklistVersionId_fkey" FOREIGN KEY ("checklistVersionId") REFERENCES "ChecklistVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ChecklistSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_qaId_fkey" FOREIGN KEY ("qaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResponse" ADD CONSTRAINT "InspectionResponse_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResponse" ADD CONSTRAINT "InspectionResponse_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoEvidence" ADD CONSTRAINT "PhotoEvidence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoEvidence" ADD CONSTRAINT "PhotoEvidence_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "InspectionResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoEvidence" ADD CONSTRAINT "PhotoEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoEvidence" ADD CONSTRAINT "PhotoEvidence_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "CorrectiveAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoEvidence" ADD CONSTRAINT "PhotoEvidence_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoEvidence" ADD CONSTRAINT "PhotoEvidence_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoEvidence" ADD CONSTRAINT "PhotoEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "InspectionResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaRelease" ADD CONSTRAINT "AreaRelease_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaRelease" ADD CONSTRAINT "AreaRelease_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaRelease" ADD CONSTRAINT "AreaRelease_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaRelease" ADD CONSTRAINT "AreaRelease_qaId_fkey" FOREIGN KEY ("qaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
