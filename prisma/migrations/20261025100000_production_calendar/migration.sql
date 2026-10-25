-- Production calendar: weekdays with no production (default Saturday + Sunday) and single-date exceptions.
-- Additive only.
ALTER TABLE "SystemSettings" ADD COLUMN "closedWeekdays" INTEGER[] NOT NULL DEFAULT ARRAY[0, 6]::INTEGER[];

CREATE TYPE "ProductionDayType" AS ENUM ('BLOCKED', 'OPEN');

CREATE TABLE "ProductionDayException" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "ProductionDayType" NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionDayException_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionDayException_date_key" ON "ProductionDayException"("date");

ALTER TABLE "ProductionDayException" ADD CONSTRAINT "ProductionDayException_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
