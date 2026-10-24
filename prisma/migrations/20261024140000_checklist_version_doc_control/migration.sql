-- Controlled-form header (document number, revision, cleaning agents ...) stored with each template version.
ALTER TABLE "ChecklistVersion" ADD COLUMN "docControl" JSONB;
