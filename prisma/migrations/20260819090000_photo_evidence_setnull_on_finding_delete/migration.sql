-- Photos are durable evidence and must survive even if the Finding they
-- were attached to is later deleted (e.g. an operator's auto-cleanup
-- correction) — never orphan or destroy evidence (spec §14).
ALTER TABLE "PhotoEvidence" DROP CONSTRAINT "PhotoEvidence_findingId_fkey";
ALTER TABLE "PhotoEvidence" ADD CONSTRAINT "PhotoEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
