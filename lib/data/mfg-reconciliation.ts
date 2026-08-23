import { db, withDbRetry } from "@/lib/db";

// Resolves the acting user's assigned Area name(s), for the per-stage edit
// check in lib/mfg-reconciliation.ts's canEditMfgStage -- returns [] for an
// unassigned user (they get no stage-level edit rights as an
// OPERATOR/TEAM_LEADER, only supervisors/QA/management/admins can edit
// unconditionally).
export async function getUserAreaNames(areaIds: string[]): Promise<string[]> {
  if (areaIds.length === 0) return [];
  const areas = await db.area.findMany({ where: { id: { in: areaIds } }, select: { name: true } });
  return areas.map((a) => a.name);
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
  return withDbRetry(() =>
    db.auditLog.findMany({
      where: { entityType: "MfgBatch", entityId: batchId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    })
  );
}

// The heaviest query in this module -- every stage joined in one shot -- and
// so the one most exposed to a cold Neon compute's "connection terminated
// unexpectedly" on the first query after idle (see lib/db.ts). Wrapped in
// withDbRetry so opening a batch doesn't 500 and force a manual reload.
export async function getMfgBatchDetail(id: string) {
  return withDbRetry(() =>
    db.mfgBatch.findUnique({
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
    })
  );
}
