import { db } from "@/lib/db";

// Only the fields each stage's yield/reconciliation math actually needs --
// the dashboard's yield alerts and the batches list's status column, not a
// full stage record. Full detail is fetched separately per-batch in
// getMfgBatchDetail.
export async function listMfgBatches() {
  return db.mfgBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      blending: { select: { totalTheoreticalWeightKg: true, totalBlendProducedKg: true } },
      encapsulation: { select: { issuedBulkBlendKg: true, targetCapsuleFillWeightMg: true, capsulesProducedKg: true, avgCapsuleFullWeightMg: true } },
      bottling: { select: { capsuleReceivedKg: true, avgCapsuleFullWeightMg: true, targetCapsulesPerBottle: true, bottlesProduced: true } },
      finishedGoodsWarehouse: { select: { qaReleased: true } },
    },
  });
}

export async function getMfgBatchAuditTrail(batchId: string) {
  return db.auditLog.findMany({
    where: { entityType: "MfgBatch", entityId: batchId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getMfgBatchDetail(id: string) {
  return db.mfgBatch.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      warehouseIssue: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
      blending: true,
      encapsulation: true,
      bottling: true,
      xrayInspection: true,
      packaging: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
      finishedGoodsWarehouse: true,
      dispatchEvents: { orderBy: { createdAt: "desc" } },
    },
  });
}
