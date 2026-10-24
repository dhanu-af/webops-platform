-- Indexes for the queries every screen runs. Postgres does not index foreign keys
-- on its own, so lookups by schedule, operator, version, user and date were
-- scanning whole tables as records grew. Purely additive; names match what
-- Prisma generates from the @@index entries in schema.prisma.
CREATE INDEX IF NOT EXISTS "Inspection_scheduleId_createdAt_idx" ON "Inspection"("scheduleId", "createdAt");
CREATE INDEX IF NOT EXISTS "Inspection_createdAt_idx" ON "Inspection"("createdAt");
CREATE INDEX IF NOT EXISTS "Inspection_operatorId_idx" ON "Inspection"("operatorId");
CREATE INDEX IF NOT EXISTS "Inspection_checklistVersionId_idx" ON "Inspection"("checklistVersionId");
CREATE INDEX IF NOT EXISTS "Inspection_sectionId_idx" ON "Inspection"("sectionId");

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");

CREATE INDEX IF NOT EXISTS "InspectionResponse_checklistItemId_idx" ON "InspectionResponse"("checklistItemId");
CREATE INDEX IF NOT EXISTS "InspectionResponse_respondedById_idx" ON "InspectionResponse"("respondedById");

CREATE INDEX IF NOT EXISTS "Finding_inspectionId_idx" ON "Finding"("inspectionId");

CREATE INDEX IF NOT EXISTS "ChecklistSchedule_checklistId_idx" ON "ChecklistSchedule"("checklistId");
CREATE INDEX IF NOT EXISTS "ChecklistSchedule_areaId_idx" ON "ChecklistSchedule"("areaId");
