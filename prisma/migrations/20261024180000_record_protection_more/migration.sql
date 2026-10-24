-- More GMP record protection, enforced in the database (see 20261023100100_urs_immutability_triggers).
--
-- * A signature (VerificationRecord) can never be changed after it is made.
-- * An answer on a record that is QA-approved or closed can never be changed.
-- * A completed manufacturing batch and a QC sample that has gone to the lab can never be deleted.
-- The same transaction-local switch used by the dev seed (webops.allow_record_delete) bypasses these.

CREATE OR REPLACE FUNCTION webops_block_record_change() RETURNS trigger AS $$
BEGIN
  IF current_setting('webops.allow_record_delete', true) = 'on' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Records in "%" cannot be changed once made (GMP record integrity).', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION webops_block_closed_response_change() RETURNS trigger AS $$
DECLARE
  parent_status text;
BEGIN
  IF current_setting('webops.allow_record_delete', true) = 'on' THEN
    RETURN NEW;
  END IF;
  SELECT status::text INTO parent_status FROM "Inspection" WHERE id = NEW."inspectionId";
  IF parent_status IN ('QA_APPROVED', 'CLOSED') THEN
    RAISE EXCEPTION 'Answers on an approved or closed record cannot be changed (GMP record integrity).'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VerificationRecord_block_update" BEFORE UPDATE ON "VerificationRecord"
  FOR EACH ROW EXECUTE FUNCTION webops_block_record_change();

CREATE TRIGGER "InspectionResponse_block_closed_update" BEFORE UPDATE ON "InspectionResponse"
  FOR EACH ROW EXECUTE FUNCTION webops_block_closed_response_change();

CREATE TRIGGER "MfgBatch_block_completed_delete" BEFORE DELETE ON "MfgBatch"
  FOR EACH ROW WHEN (OLD.status::text = 'COMPLETED') EXECUTE FUNCTION webops_block_record_delete();

CREATE TRIGGER "QcSample_block_lab_delete" BEFORE DELETE ON "QcSample"
  FOR EACH ROW WHEN (OLD.status::text NOT IN ('WAITING_COLLECTION', 'COLLECTED')) EXECUTE FUNCTION webops_block_record_delete();
