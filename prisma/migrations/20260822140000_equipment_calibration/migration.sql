-- CreateTable
CREATE TABLE "EquipmentCalibration" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "calibratedDate" TIMESTAMP(3) NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "performedBy" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "certificateUrl" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentCalibration_equipmentId_calibratedDate_idx" ON "EquipmentCalibration"("equipmentId", "calibratedDate");

-- CreateIndex
CREATE INDEX "EquipmentCalibration_dueDate_idx" ON "EquipmentCalibration"("dueDate");

-- AddForeignKey
ALTER TABLE "EquipmentCalibration" ADD CONSTRAINT "EquipmentCalibration_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCalibration" ADD CONSTRAINT "EquipmentCalibration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
