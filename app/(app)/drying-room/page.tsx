import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listDryingBays, listMiscStorageItems } from "@/lib/data/drying-room";
import { getDryingRoomMetrics } from "@/lib/actions/drying-room-actions";
import DryingRoomClient from "./drying-room-client";

const BAY_COUNT = 7;

export default async function DryingRoomPage() {
  const session = await auth();

  const bayCount = await db.dryingBay.count();
  if (bayCount < BAY_COUNT) {
    await db.dryingBay.createMany({
      data: Array.from({ length: BAY_COUNT }, (_, i) => ({ bayNumber: i + 1 })),
      skipDuplicates: true,
    });
  }

  const [bays, misc, employees, metrics] = await Promise.all([
    listDryingBays(),
    listMiscStorageItems(),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getDryingRoomMetrics(),
  ]);

  return (
    <DryingRoomClient
      bays={bays.map((b) => ({
        id: b.id,
        bayNumber: b.bayNumber,
        purpose: b.purpose,
        assignedEmployeeId: b.assignedEmployeeId,
        assignedEmployeeName: b.assignedEmployee?.name ?? null,
        department: b.department,
        comments: b.comments,
        expectedFinishTime: b.expectedFinishTime?.toISOString() ?? null,
        updatedAt: b.updatedAt.toISOString(),
        batches: b.batches.map((batch) => ({
          id: batch.id,
          productName: batch.productName,
          batchNumber: batch.batchNumber,
          batchSize: batch.batchSize,
          batchSizeUnit: batch.batchSizeUnit,
          numberOfTrolleys: batch.numberOfTrolleys,
          trayCount: batch.trayCount,
          dateEnteredDryingRoom: batch.dateEnteredDryingRoom.toISOString(),
          dryingStartTime: batch.dryingStartTime?.toISOString() ?? null,
          currentStage: batch.currentStage,
          stageUpdatedAt: batch.stageUpdatedAt.toISOString(),
          assignedEmployeeId: batch.assignedEmployeeId,
          assignedEmployeeName: batch.assignedEmployee?.name ?? null,
          priorityRank: batch.priorityRank,
          remarks: batch.remarks,
          trolleys: batch.trolleys.map((t) => ({
            id: t.id,
            trolleyNumber: t.trolleyNumber,
            quantity: t.quantity,
            trayCount: t.trayCount,
            wrapped: t.wrapped,
            rotationCompleted: t.rotationCompleted,
            qcStatus: t.qcStatus,
            assignedEmployeeId: t.assignedEmployeeId,
            assignedEmployeeName: t.assignedEmployee?.name ?? null,
            remarks: t.remarks,
          })),
        })),
      }))}
      misc={misc.map((m) => ({
        id: m.id,
        product: m.product,
        batchNumber: m.batchNumber,
        quantityLabel: m.quantityLabel,
        storageType: m.storageType,
        status: m.status,
        requiredAction: m.requiredAction,
        location: m.location,
        remarks: m.remarks,
        updatedAt: m.updatedAt.toISOString(),
      }))}
      employees={employees}
      canUpdate={!!session?.user && can(session.user.role, "drying.update")}
      canManage={!!session?.user && can(session.user.role, "drying.manage")}
      metrics={metrics}
    />
  );
}
