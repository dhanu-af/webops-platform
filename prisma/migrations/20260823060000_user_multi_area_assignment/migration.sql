-- CreateTable
CREATE TABLE "_UserAssignedAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserAssignedAreas_AB_unique" ON "_UserAssignedAreas"("A", "B");

-- CreateIndex
CREATE INDEX "_UserAssignedAreas_B_index" ON "_UserAssignedAreas"("B");

-- AddForeignKey
ALTER TABLE "_UserAssignedAreas" ADD CONSTRAINT "_UserAssignedAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAssignedAreas" ADD CONSTRAINT "_UserAssignedAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: carry every existing single area assignment over to the
-- new many-to-many join table before the old column is dropped.
INSERT INTO "_UserAssignedAreas" ("A", "B")
SELECT "areaId", "id" FROM "User" WHERE "areaId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_areaId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "areaId";
