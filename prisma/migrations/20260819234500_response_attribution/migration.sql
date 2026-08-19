-- Per-item attribution: who actually ticked this item and when, distinct
-- from the Inspection's overall operatorId (spec: real GMP forms expect
-- "record operator initials" per task, not one signature for the whole form).
ALTER TABLE "InspectionResponse" ADD COLUMN "respondedById" TEXT;
ALTER TABLE "InspectionResponse" ADD CONSTRAINT "InspectionResponse_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
