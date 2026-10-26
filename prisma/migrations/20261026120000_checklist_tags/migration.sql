-- Every checklist (document) gets its own tag code, so an NFC tag / QR code can open that document. Additive.
ALTER TABLE "Checklist" ADD COLUMN "qrToken" TEXT, ADD COLUMN "tagWrittenAt" TIMESTAMP(3);
UPDATE "Checklist" SET "qrToken" = 'c' || md5(random()::text || clock_timestamp()::text || "id");
ALTER TABLE "Checklist" ALTER COLUMN "qrToken" SET NOT NULL;
CREATE UNIQUE INDEX "Checklist_qrToken_key" ON "Checklist"("qrToken");
