-- GMP record integrity (URS-11 / URS-12): enforced in the database, not just in
-- application code, so no code path, script or console session can silently
-- delete a record or rewrite the audit trail.
--
-- Records: rows can never be deleted.
-- AuditLog: rows can never be updated or deleted (append-only).
--
-- The one escape hatch is a transaction-local setting used only by the dev
-- seed (prisma/seed.ts), which wipes and rebuilds demo data:
--   SET LOCAL webops.allow_record_delete = 'on';
-- It cannot be set by the application's normal request paths.

CREATE OR REPLACE FUNCTION webops_block_record_delete() RETURNS trigger AS $$
BEGIN
  IF current_setting('webops.allow_record_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Records in "%" cannot be deleted (GMP record integrity).', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION webops_block_audit_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('webops.allow_record_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'The audit trail is read-only: % on "%" is not allowed.', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Inspection_block_delete" BEFORE DELETE ON "Inspection"
  FOR EACH ROW EXECUTE FUNCTION webops_block_record_delete();
CREATE TRIGGER "InspectionResponse_block_delete" BEFORE DELETE ON "InspectionResponse"
  FOR EACH ROW EXECUTE FUNCTION webops_block_record_delete();
CREATE TRIGGER "VerificationRecord_block_delete" BEFORE DELETE ON "VerificationRecord"
  FOR EACH ROW EXECUTE FUNCTION webops_block_record_delete();
CREATE TRIGGER "CorrectiveAction_block_delete" BEFORE DELETE ON "CorrectiveAction"
  FOR EACH ROW EXECUTE FUNCTION webops_block_record_delete();
CREATE TRIGGER "AuditLog_block_change" BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION webops_block_audit_change();
