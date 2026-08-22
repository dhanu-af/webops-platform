import { db } from "@/lib/db";

// Resolves the acting user's assigned Area name, for the per-stage edit
// check in lib/mfg-reconciliation.ts's canEditMfgStage -- returns null for
// an unassigned user (they get no stage-level edit rights as an
// OPERATOR/TEAM_LEADER, only supervisors/QA/management/admins can edit
// unconditionally).
export async function getUserAreaName(areaId: string | null): Promise<string | null> {
  if (!areaId) return null;
  const area = await db.area.findUnique({ where: { id: areaId }, select: { name: true } });
  return area?.name ?? null;
}

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
