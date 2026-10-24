-- Who recorded a corrective action (the recorder cannot also sign it off). Additive and nullable.
ALTER TABLE "CorrectiveAction" ADD COLUMN "createdById" TEXT;
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
