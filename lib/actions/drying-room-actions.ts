"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session-user";
import { logAudit } from "@/lib/audit";
import { STAGE_LABEL } from "@/lib/drying-room-defaults";
import { changedFields } from "@/lib/inspection-rules";
import type { DryingBayPurpose, DryingStage, TrolleyQcStatus } from "@/app/generated/prisma/client";

const BASE_PATH = "/drying-room";

async function requireUpdateAccess() {
  return { user: await requireLiveUser("drying.update") };
}

async function requireManageAccess() {
  return { user: await requireLiveUser("drying.manage") };
}

async function createBay__impl() {
  const session = await requireManageAccess();

  const highest = await db.dryingBay.findFirst({ orderBy: { bayNumber: "desc" } });
  const bayNumber = (highest?.bayNumber ?? 0) + 1;

  const bay = await db.dryingBay.create({ data: { bayNumber, updatedByName: session.user.name } });

  await logAudit({ entityType: "DryingBay", entityId: bay.id, action: "CREATED", userId: session.user.id, reason: `Added Bay ${bayNumber}` });

  revalidatePath(BASE_PATH);
  return { id: bay.id, bayNumber };
}

async function updateBayPurpose__impl(
  bayId: string,
  data: {
    purpose: DryingBayPurpose;
    assignedEmployeeId: string | null;
    department: string | null;
    comments: string | null;
    expectedFinishTime: string | null;
  }
) {
  const session = await requireUpdateAccess();

  await db.dryingBay.update({
    where: { id: bayId },
    data: {
      purpose: data.purpose,
      assignedEmployeeId: data.assignedEmployeeId,
      department: data.department,
      comments: data.comments,
      expectedFinishTime: data.expectedFinishTime ? new Date(data.expectedFinishTime) : null,
      updatedByName: session.user.name,
    },
  });

  await logAudit({ entityType: "DryingBay", entityId: bayId, action: "EDITED", userId: session.user.id, reason: `Set bay purpose to ${data.purpose}` });

  revalidatePath(BASE_PATH);
}

async function createBatch__impl(
  bayId: string | null,
  data: {
    productName: string;
    batchNumber: string;
    batchSize: number;
    batchSizeUnit: string;
    numberOfTrolleys: number;
    trayCount: number;
    dateEnteredDryingRoom: string;
    dryingStartTime: string | null;
    assignedEmployeeId: string | null;
    priorityRank: number | null;
  }
) {
  const session = await requireUpdateAccess();

  if (!data.productName.trim() || !data.batchNumber.trim()) throw new UserFacingError("Product name and batch number are required");

  const batch = await db.dryingBatch.create({
    data: {
      bayId,
      productName: data.productName.trim(),
      batchNumber: data.batchNumber.trim(),
      batchSize: data.batchSize,
      batchSizeUnit: data.batchSizeUnit || "kg",
      numberOfTrolleys: data.numberOfTrolleys,
      trayCount: data.trayCount,
      dateEnteredDryingRoom: new Date(data.dateEnteredDryingRoom),
      dryingStartTime: data.dryingStartTime ? new Date(data.dryingStartTime) : null,
      assignedEmployeeId: data.assignedEmployeeId,
      priorityRank: data.priorityRank,
      updatedByName: session.user.name,
      trolleys: {
        create: Array.from({ length: Math.max(1, data.numberOfTrolleys) }, (_, i) => ({ trolleyNumber: i + 1 })),
      },
    },
  });

  await logAudit({
    entityType: "DryingBatch",
    entityId: batch.id,
    action: "CREATED",
    userId: session.user.id,
    reason: `Added batch ${data.productName} · ${data.batchNumber} (${data.numberOfTrolleys} trolleys)`,
  });

  revalidatePath(BASE_PATH);
}

async function deleteBatch__impl(batchId: string) {
  const session = await requireManageAccess();

  const batch = await db.dryingBatch.findUniqueOrThrow({ where: { id: batchId }, include: { trolleys: true } });

  await db.$transaction(async (tx) => {
    await tx.dryingBatch.delete({ where: { id: batchId } });
    // The record, with its trolleys, is kept in the audit trail so a mistaken removal can be reconstructed.
    await logAudit(
      {
        entityType: "DryingBatch",
        entityId: batchId,
        action: "DELETED",
        userId: session.user.id,
        oldValue: JSON.parse(JSON.stringify(batch)),
        reason: `Removed batch ${batch.productName} · ${batch.batchNumber}`,
      },
      tx
    );
  });

  revalidatePath(BASE_PATH);
}

async function moveBatchToBay__impl(batchId: string, bayId: string | null) {
  const session = await requireUpdateAccess();

  await db.dryingBatch.update({ where: { id: batchId }, data: { bayId, updatedByName: session.user.name } });

  await logAudit({
    entityType: "DryingBatch",
    entityId: batchId,
    action: "EDITED",
    userId: session.user.id,
    newValue: { bayId },
    reason: bayId ? `Moved batch to a different bay` : `Unassigned batch from its bay`,
  });

  revalidatePath(BASE_PATH);
}

async function updateBatchPriority__impl(batchId: string, priorityRank: number | null) {
  const session = await requireUpdateAccess();

  await db.dryingBatch.update({ where: { id: batchId }, data: { priorityRank, updatedByName: session.user.name } });

  await logAudit({
    entityType: "DryingBatch",
    entityId: batchId,
    action: "EDITED",
    userId: session.user.id,
    reason: priorityRank ? `Set batch to priority ${priorityRank}` : `Cleared priority on batch`,
  });

  revalidatePath(BASE_PATH);
}

async function updateBatchRemarks__impl(batchId: string, remarks: string | null) {
  const session = await requireUpdateAccess();

  await db.dryingBatch.update({ where: { id: batchId }, data: { remarks, updatedByName: session.user.name } });

  await logAudit({ entityType: "DryingBatch", entityId: batchId, action: "EDITED", userId: session.user.id, reason: "Updated batch remarks" });

  revalidatePath(BASE_PATH);
}

/**
 * The core daily-use action. `newValue: { stage }` is deliberately structured
 * (not just a free-text reason) -- getDryingRoomMetrics below reconstructs
 * per-stage timestamps by reading it back out, so a batch's stage history
 * doesn't need its own dedicated table.
 */
// A QC decision is not the operator's to make: approving or holding a batch, and moving a batch that is on
// QC hold, needs a QA/Supervisor role (drying.manage). Everything else stays open to the floor.
const QC_DECISION_STAGES: DryingStage[] = ["QC_APPROVED", "QC_HOLD"];

async function updateBatchStage__impl(batchId: string, stage: DryingStage) {
  const previous = await db.dryingBatch.findUniqueOrThrow({ where: { id: batchId }, select: { currentStage: true } });
  const isQcDecision = QC_DECISION_STAGES.includes(stage) || previous.currentStage === "QC_HOLD";
  const session = isQcDecision ? await requireManageAccess() : await requireUpdateAccess();

  await db.dryingBatch.update({
    where: { id: batchId },
    data: {
      currentStage: stage,
      stageUpdatedAt: new Date(),
      completedAt: stage === "COMPLETE" ? new Date() : null,
      updatedByName: session.user.name,
    },
  });

  await logAudit({
    entityType: "DryingBatch",
    entityId: batchId,
    action: "DRYING_STAGE_CHANGED",
    userId: session.user.id,
    oldValue: { stage: previous.currentStage },
    newValue: { stage },
    reason: `Set batch to ${STAGE_LABEL[stage]}`,
  });

  revalidatePath(BASE_PATH);
}

async function updateTrolley__impl(
  trolleyId: string,
  data: {
    quantity: number | null;
    trayCount: number | null;
    wrapped: boolean;
    rotationCompleted: boolean;
    qcStatus: TrolleyQcStatus;
    assignedEmployeeId: string | null;
    remarks: string | null;
  }
) {
  const before = await db.dryingTrolley.findUniqueOrThrow({ where: { id: trolleyId } });
  // The QC result on a trolley is a QC decision: only QA/Supervisor roles may change it.
  const session = data.qcStatus !== before.qcStatus ? await requireManageAccess() : await requireUpdateAccess();

  await db.dryingTrolley.update({ where: { id: trolleyId }, data });

  const changes = changedFields(before, data);
  if (changes.length === 0) {
    await logAudit({ entityType: "DryingTrolley", entityId: trolleyId, action: "EDITED", userId: session.user.id, reason: "Trolley saved with no change" });
  }
  for (const c of changes) {
    await logAudit({
      entityType: "DryingTrolley",
      entityId: trolleyId,
      action: "EDITED",
      userId: session.user.id,
      fieldName: c.field,
      oldValue: { value: c.oldValue as string | number | boolean | null },
      newValue: { value: c.newValue as string | number | boolean | null },
      reason: `Trolley ${before.trolleyNumber}: ${c.field} changed`,
    });
  }

  revalidatePath(BASE_PATH);
}

async function upsertMiscStorageItem__impl(
  id: string | null,
  data: {
    product: string;
    batchNumber: string | null;
    quantityLabel: string;
    storageType: string | null;
    status: string | null;
    requiredAction: string | null;
    location: string | null;
    remarks: string | null;
  }
) {
  const session = await requireUpdateAccess();

  if (!data.product.trim() || !data.quantityLabel.trim()) throw new UserFacingError("Product and quantity are required");

  let itemId = id;
  if (id) {
    await db.miscStorageItem.update({ where: { id }, data: { ...data, updatedByName: session.user.name } });
  } else {
    const created = await db.miscStorageItem.create({ data: { ...data, updatedByName: session.user.name } });
    itemId = created.id;
  }

  await logAudit({
    entityType: "MiscStorageItem",
    entityId: itemId!,
    action: id ? "EDITED" : "CREATED",
    userId: session.user.id,
    reason: `${id ? "Updated" : "Added"} misc storage item: ${data.product}`,
  });

  revalidatePath(BASE_PATH);
}

async function deleteMiscStorageItem__impl(id: string) {
  const session = await requireManageAccess();

  const item = await db.miscStorageItem.delete({ where: { id } });

  await logAudit({ entityType: "MiscStorageItem", entityId: id, action: "DELETED", userId: session.user.id, reason: `Removed misc storage item: ${item.product}` });

  revalidatePath(BASE_PATH);
}

export type DryingRoomMetrics = {
  avgDryingTimeHours: number | null;
  avgTimeToQcHours: number | null;
  throughputToday: number;
  throughputThisWeek: number;
};

const QC_STAGES = new Set<DryingStage>(["QC_SAMPLING", "QC_PENDING", "QC_APPROVED", "QC_HOLD"]);
const STILL_DRYING_STAGES = new Set<DryingStage>(["RECEIVING", "DRYING", "ROTATION_REQUIRED", "CONTINUE_DRYING"]);

function startOfWeekMonday(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/**
 * Average Drying Time / Average Time to QC / Throughput -- reconstructed
 * from the existing AuditLog trail (every updateBatchStage call writes a
 * DRYING_STAGE_CHANGED entry with `newValue: { stage }`) rather than a
 * dedicated stage-history table. Only completed batches count, since
 * in-progress batches don't have a real duration yet.
 */
export async function getDryingRoomMetrics(): Promise<DryingRoomMetrics> {
  await requireLiveUser("view");

  const completed = await db.dryingBatch.findMany({
    where: { completedAt: { not: null } },
    select: { id: true, dryingStartTime: true, dateEnteredDryingRoom: true, completedAt: true },
    orderBy: { completedAt: "desc" },
    take: 200,
  });

  const batchIds = completed.map((b) => b.id);
  const stageLogs = batchIds.length
    ? await db.auditLog.findMany({
        where: { entityType: "DryingBatch", entityId: { in: batchIds }, action: "DRYING_STAGE_CHANGED" },
        orderBy: { createdAt: "asc" },
        select: { entityId: true, newValue: true, createdAt: true },
      })
    : [];

  const transitionsByBatch = new Map<string, { stage: DryingStage; at: Date }[]>();
  for (const log of stageLogs) {
    const stage = (log.newValue as { stage?: string } | null)?.stage as DryingStage | undefined;
    if (!stage) continue;
    const list = transitionsByBatch.get(log.entityId) ?? [];
    list.push({ stage, at: log.createdAt });
    transitionsByBatch.set(log.entityId, list);
  }

  const dryingDurationsHours: number[] = [];
  const timeToQcHours: number[] = [];

  for (const batch of completed) {
    const start = batch.dryingStartTime ?? batch.dateEnteredDryingRoom;
    const transitions = transitionsByBatch.get(batch.id) ?? [];

    const leftDrying = transitions.find((t) => !STILL_DRYING_STAGES.has(t.stage));
    if (leftDrying) dryingDurationsHours.push((leftDrying.at.getTime() - start.getTime()) / 3_600_000);

    const reachedQc = transitions.find((t) => QC_STAGES.has(t.stage));
    if (reachedQc) timeToQcHours.push((reachedQc.at.getTime() - start.getTime()) / 3_600_000);
  }

  const avg = (nums: number[]) => (nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = startOfWeekMonday(now);

  return {
    avgDryingTimeHours: avg(dryingDurationsHours),
    avgTimeToQcHours: avg(timeToQcHours),
    throughputToday: completed.filter((b) => b.completedAt! >= startOfToday).length,
    throughputThisWeek: completed.filter((b) => b.completedAt! >= startOfWeek).length,
  };
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function createBatch(...args: Parameters<typeof createBatch__impl>) {
  return guard(() => createBatch__impl(...args));
}

export async function createBay(...args: Parameters<typeof createBay__impl>) {
  return guard(() => createBay__impl(...args));
}

export async function deleteBatch(...args: Parameters<typeof deleteBatch__impl>) {
  return guard(() => deleteBatch__impl(...args));
}

export async function deleteMiscStorageItem(...args: Parameters<typeof deleteMiscStorageItem__impl>) {
  return guard(() => deleteMiscStorageItem__impl(...args));
}

export async function moveBatchToBay(...args: Parameters<typeof moveBatchToBay__impl>) {
  return guard(() => moveBatchToBay__impl(...args));
}

export async function updateBatchPriority(...args: Parameters<typeof updateBatchPriority__impl>) {
  return guard(() => updateBatchPriority__impl(...args));
}

export async function updateBatchRemarks(...args: Parameters<typeof updateBatchRemarks__impl>) {
  return guard(() => updateBatchRemarks__impl(...args));
}

export async function updateBatchStage(...args: Parameters<typeof updateBatchStage__impl>) {
  return guard(() => updateBatchStage__impl(...args));
}

export async function updateBayPurpose(...args: Parameters<typeof updateBayPurpose__impl>) {
  return guard(() => updateBayPurpose__impl(...args));
}

export async function updateTrolley(...args: Parameters<typeof updateTrolley__impl>) {
  return guard(() => updateTrolley__impl(...args));
}

export async function upsertMiscStorageItem(...args: Parameters<typeof upsertMiscStorageItem__impl>) {
  return guard(() => upsertMiscStorageItem__impl(...args));
}
