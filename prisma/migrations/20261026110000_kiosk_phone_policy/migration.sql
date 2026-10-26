-- Staff phones may use machine tags with a PIN (admin can switch this off). Additive only.
ALTER TABLE "SystemSettings" ADD COLUMN "kioskAllowAnyPhone" BOOLEAN NOT NULL DEFAULT true;
