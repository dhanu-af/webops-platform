"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session-user";
import { logAudit } from "@/lib/audit";
import { auditDiff } from "@/lib/audit-diff";
import { verifySignaturePassword } from "@/lib/signature";
import { formatSampleId } from "@/lib/qc-sample-defaults";
import type { QcSampleType, QcProductCategory, QcTestResult } from "@/app/generated/prisma/client";

const BASE_PATH = "/qc-samples";

async function requireManageAccess() {
  return requireLiveUser("qc.manage");
}

async function requireCollectAccess() {
  return requireLiveUser("qc.collect");
}

async function requireLabAccess() {
  return requireLiveUser("qc.lab");
}

type NewQcSample = {
  productName: string;
  batchNumber: string;
  mfgBatchId: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  sampleType: QcSampleType;
  productCategory: QcProductCategory | null;
  quantity: number;
  unit: string;
  collectionDate: string | null;
  collectionTime: string | null;
  productionRoom: string | null;
  sampleStorageLocation: string | null;
  storageTemperature: string | null;
  storageCondition: string | null;
  remarks: string | null;
};

async function createQcSample__impl(data: NewQcSample) {
  const actor = await requireCollectAccess();
  if (!data.productName || !data.batchNumber || !data.sampleType || !data.unit) {
    throw new UserFacingError("Product, batch number, sample type, and unit are required");
  }

  const sample = await db.$transaction(async (tx) => {
    const created = await tx.qcSample.create({
      data: {
        sampleId: `TEMP-${crypto.randomUUID()}`,
        productName: data.productName,
        batchNumber: data.batchNumber,
        mfgBatchId: data.mfgBatchId,
        manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        sampleType: data.sampleType,
        productCategory: data.productCategory,
        quantity: data.quantity,
        unit: data.unit,
        collectedById: actor.id,
        collectionDate: data.collectionDate ? new Date(data.collectionDate) : null,
        collectionTime: data.collectionTime,
        productionRoom: data.productionRoom,
        sampleStorageLocation: data.sampleStorageLocation,
        storageTemperature: data.storageTemperature,
        storageCondition: data.storageCondition,
        remarks: data.remarks,
        createdById: actor.id,
      },
    });
    return tx.qcSample.update({
      where: { id: created.id },
      data: { sampleId: formatSampleId(created.sequence, created.createdAt) },
    });
  });

  await logAudit({
    entityType: "QcSample",
    entityId: sample.id,
    action: "CREATED",
    userId: actor.id,
    newValue: { productName: sample.productName, batchNumber: sample.batchNumber },
    reason: `Sample ${sample.sampleId} created for ${sample.productName} (batch ${sample.batchNumber})`,
  });

  revalidatePath(BASE_PATH);
  return sample;
}

async function updateQcSample__impl(id: string, data: NewQcSample) {
  const actor = await requireManageAccess();
  if (!data.productName || !data.batchNumber || !data.sampleType || !data.unit) {
    throw new UserFacingError("Product, batch number, sample type, and unit are required");
  }

  const before = await db.qcSample.findUniqueOrThrow({ where: { id } });
  const FINAL_STATES = ["APPROVED", "REJECTED", "RETENTION", "EXPIRED", "DISPOSED"];
  if (FINAL_STATES.includes(before.status)) {
    throw new UserFacingError(`Sample ${before.sampleId} has been ${before.status === "APPROVED" || before.status === "REJECTED" ? before.status.toLowerCase() : "decided"}, so its details are locked.`);
  }

  const sample = await db.qcSample.update({
    where: { id },
    data: {
      productName: data.productName,
      batchNumber: data.batchNumber,
      mfgBatchId: data.mfgBatchId,
      manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      sampleType: data.sampleType,
      productCategory: data.productCategory,
      quantity: data.quantity,
      unit: data.unit,
      collectionDate: data.collectionDate ? new Date(data.collectionDate) : null,
      collectionTime: data.collectionTime,
      productionRoom: data.productionRoom,
      sampleStorageLocation: data.sampleStorageLocation,
      storageTemperature: data.storageTemperature,
      storageCondition: data.storageCondition,
      remarks: data.remarks,
    },
  });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "EDITED",
    userId: actor.id,
    reason: `Updated sample ${sample.sampleId}`,
    ...auditDiff(before, {
      productName: sample.productName,
      batchNumber: sample.batchNumber,
      mfgBatchId: sample.mfgBatchId,
      manufacturingDate: sample.manufacturingDate,
      expiryDate: sample.expiryDate,
      sampleType: sample.sampleType,
      productCategory: sample.productCategory,
      quantity: sample.quantity,
      unit: sample.unit,
      collectionDate: sample.collectionDate,
      collectionTime: sample.collectionTime,
      productionRoom: sample.productionRoom,
      sampleStorageLocation: sample.sampleStorageLocation,
      storageTemperature: sample.storageTemperature,
      storageCondition: sample.storageCondition,
      remarks: sample.remarks,
    }),
  });

  revalidatePath(BASE_PATH);
}

async function markCollected__impl(id: string) {
  const actor = await requireCollectAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "WAITING_COLLECTION") throw new UserFacingError("Sample is not waiting collection");

  await db.qcSample.update({
    where: { id },
    data: {
      status: "COLLECTED",
      collectedById: sample.collectedById ?? actor.id,
      collectionDate: sample.collectionDate ?? new Date(),
    },
  });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_COLLECTED",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} collected`,
  });

  revalidatePath(BASE_PATH);
}

async function markSentToLab__impl(
  id: string,
  data: { sentDate: string; courierOrInternal: string | null; laboratoryName: string | null; laboratoryLocation: string | null }
) {
  const actor = await requireCollectAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "COLLECTED") throw new UserFacingError("Sample must be collected before it can be sent to the lab");

  await db.qcSample.update({
    where: { id },
    data: {
      status: "WAITING_LAB",
      sentToLab: true,
      sentDate: new Date(data.sentDate),
      courierOrInternal: data.courierOrInternal,
      laboratoryName: data.laboratoryName,
      laboratoryLocation: data.laboratoryLocation,
    },
  });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_SENT_TO_LAB",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} sent to laboratory`,
  });

  revalidatePath(BASE_PATH);
}

async function markLabReceived__impl(id: string) {
  const actor = await requireLabAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "WAITING_LAB") throw new UserFacingError("Sample has not been sent to the lab yet");

  await db.qcSample.update({
    where: { id },
    data: { status: "IN_LABORATORY", receivedByQcId: actor.id, receivedDate: new Date() },
  });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_RECEIVED_AT_LAB",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} received at the laboratory`,
  });

  revalidatePath(BASE_PATH);
}

async function markTestingStarted__impl(id: string) {
  const actor = await requireLabAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "IN_LABORATORY") throw new UserFacingError("Sample must be received at the laboratory first");

  await db.qcSample.update({ where: { id }, data: { status: "TESTING" } });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_TESTING_STARTED",
    userId: actor.id,
    reason: `Testing started for sample ${sample.sampleId}`,
  });

  revalidatePath(BASE_PATH);
}

type LabTestItemInput = { section: string; parameter: string; result: QcTestResult | null; details: string | null };

// Saves the full product-category checklist in one go -- rows are always
// replaced wholesale since the template (and therefore the row set) is
// derived from the sample's productCategory, not edited piecemeal.
async function recordLabTestResults__impl(id: string, items: LabTestItemInput[]) {
  const actor = await requireLabAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "TESTING" && sample.status !== "IN_LABORATORY") {
    throw new UserFacingError("Sample must be in the laboratory before test results can be recorded");
  }
  if (!sample.productCategory) {
    throw new UserFacingError("Set a Product Category on the sample record before recording test results");
  }

  const previousItems = await db.qcLabTestItem.findMany({ where: { labTest: { sampleId: id } }, orderBy: { sortOrder: "asc" }, select: { section: true, parameter: true, result: true, details: true } });

  await db.$transaction(async (tx) => {
    const labTest = await tx.qcLabTest.upsert({
      where: { sampleId: id },
      create: { sampleId: id, testedById: actor.id, testedAt: new Date() },
      update: { testedById: actor.id, testedAt: new Date() },
    });
    await tx.qcLabTestItem.deleteMany({ where: { labTestId: labTest.id } });
    await tx.qcLabTestItem.createMany({
      data: items.map((it, i) => ({
        labTestId: labTest.id,
        section: it.section,
        parameter: it.parameter,
        result: it.result,
        details: it.details,
        sortOrder: i,
      })),
    });
    await tx.qcSample.update({ where: { id }, data: { status: "WAITING_RESULTS" } });
  });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_RESULTS_RECORDED",
    userId: actor.id,
    // Every save replaces the table of results, so what was there before is kept here.
    oldValue: previousItems.length ? { results: previousItems.map((r) => `${r.section} / ${r.parameter}: ${r.result ?? "-"}${r.details ? ` (${r.details})` : ""}`) } : undefined,
    newValue: { results: items.map((r) => `${r.section} / ${r.parameter}: ${r.result ?? "-"}${r.details ? ` (${r.details})` : ""}`) },
    reason: `Lab test results recorded for sample ${sample.sampleId}${previousItems.length ? " (replacing earlier results)" : ""}`,
  });

  revalidatePath(BASE_PATH);
}

async function approveSample__impl(id: string, password?: string) {
  const actor = await requireLabAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id }, include: { labTest: { include: { items: true } } } });
  if (sample.status !== "WAITING_RESULTS") throw new UserFacingError("Sample is not awaiting a result");

  // Release is a second-person decision on complete, passing results.
  if (sample.labTest?.testedById === actor.id) throw new UserFacingError("You recorded these results, so someone else must approve the sample.");
  const items = sample.labTest?.items ?? [];
  if (items.length === 0) throw new UserFacingError("There are no test results to approve.");
  const missing = items.filter((i) => i.result === null).length;
  if (missing > 0) throw new UserFacingError(`${missing} test result${missing === 1 ? " is" : "s are"} still blank. Complete every result before approving.`);
  if (items.some((i) => i.result === "FAIL")) throw new UserFacingError("One or more results are FAIL, so this sample cannot be approved. Reject it and investigate.");

  await verifySignaturePassword(actor.id, password, `approval of QC sample ${sample.sampleId}`);
  const claimed = await db.qcSample.updateMany({ where: { id, status: "WAITING_RESULTS" }, data: { status: "APPROVED" } });
  if (claimed.count !== 1) throw new UserFacingError("This sample was just decided by someone else. Refresh the page.");

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_APPROVED",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} approved - signed by ${actor.name} (${actor.role})`,
  });

  revalidatePath(BASE_PATH);
}

async function rejectSample__impl(id: string, reason: string, password?: string) {
  const actor = await requireLabAccess();
  if (!reason?.trim()) throw new UserFacingError("A rejection reason is required");
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "WAITING_RESULTS") throw new UserFacingError("Sample is not awaiting a result");
  await verifySignaturePassword(actor.id, password, `rejection of QC sample ${sample.sampleId}`);

  await db.qcSample.update({
    where: { id },
    data: { status: "REJECTED", remarks: [sample.remarks, `Rejected: ${reason}`].filter(Boolean).join("\n") },
  });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "REJECTED",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} rejected: ${reason} - signed by ${actor.name} (${actor.role})`,
  });

  revalidatePath(BASE_PATH);
}

type RetentionInput = {
  shelf: string | null;
  cabinet: string | null;
  boxNumber: string | null;
  position: string | null;
  quantityRemaining: number | null;
};

async function moveToRetention__impl(id: string, data: RetentionInput) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "APPROVED") throw new UserFacingError("Only an approved sample can move to retention");

  await db.$transaction([
    db.qcRetentionRecord.upsert({
      where: { sampleId: id },
      create: { sampleId: id, ...data, expiryDate: sample.expiryDate, lastChecked: new Date() },
      update: { ...data, lastChecked: new Date() },
    }),
    db.qcSample.update({ where: { id }, data: { status: "RETENTION" } }),
  ]);

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_MOVED_TO_RETENTION",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} moved to retention storage`,
  });

  revalidatePath(BASE_PATH);
}

async function updateRetentionRecord__impl(
  id: string,
  data: RetentionInput & { opened: boolean; lastChecked: string | null; destroyDate: string | null }
) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });

  await db.qcRetentionRecord.update({
    where: { sampleId: id },
    data: {
      shelf: data.shelf,
      cabinet: data.cabinet,
      boxNumber: data.boxNumber,
      position: data.position,
      quantityRemaining: data.quantityRemaining,
      opened: data.opened,
      lastChecked: data.lastChecked ? new Date(data.lastChecked) : new Date(),
      destroyDate: data.destroyDate ? new Date(data.destroyDate) : null,
    },
  });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "EDITED",
    userId: actor.id,
    reason: `Retention record updated for sample ${sample.sampleId}`,
  });

  revalidatePath(BASE_PATH);
}

async function markExpired__impl(id: string) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "RETENTION") throw new UserFacingError("Only a retained sample can be marked expired");

  await db.qcSample.update({ where: { id }, data: { status: "EXPIRED" } });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_EXPIRED",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} marked expired`,
  });

  revalidatePath(BASE_PATH);
}

async function markDisposed__impl(id: string) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id }, include: { retentionRecord: true } });
  if (sample.status !== "RETENTION" && sample.status !== "EXPIRED") {
    throw new UserFacingError("Only a retained or expired sample can be disposed");
  }

  await db.$transaction([
    db.qcSample.update({ where: { id }, data: { status: "DISPOSED" } }),
    ...(sample.retentionRecord && !sample.retentionRecord.destroyDate
      ? [db.qcRetentionRecord.update({ where: { sampleId: id }, data: { destroyDate: new Date() } })]
      : []),
  ]);

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_DISPOSED",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} disposed`,
  });

  revalidatePath(BASE_PATH);
}

// Normal delete only allowed pre-lab-result -- nothing downstream (test
// results, retention) depends on the sample yet. Super Admin can
// force-delete at any stage regardless (e.g. to clean up test/mistake
// data); cascading QcLabTest/QcRetentionRecord/QcSampleAttachment rows are
// removed automatically via the schema's onDelete: Cascade.
async function deleteQcSample__impl(id: string) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });

  // A sample that has gone to the lab is a GMP record and is kept, whoever asks.
  if (sample.status !== "WAITING_COLLECTION" && sample.status !== "COLLECTED") {
    throw new UserFacingError("Can't delete — this sample already has lab or retention history, so the record is kept.");
  }

  await db.$transaction(async (tx) => {
    await tx.qcSample.delete({ where: { id } });
    await logAudit(
      {
        entityType: "QcSample",
        entityId: id,
        action: "DELETED",
        userId: actor.id,
        oldValue: JSON.parse(JSON.stringify(sample)),
        reason: `Deleted sample ${sample.sampleId} (never sent to lab)`,
      },
      tx
    );
  });

  revalidatePath(BASE_PATH);
}

async function getQcSampleAuditTrail__impl(sampleId: string) {
  await requireLiveUser("view");

  const entries = await db.auditLog.findMany({
    where: { entityType: "QcSample", entityId: sampleId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return entries.map((e) => ({
    id: e.id,
    actorName: e.user.name,
    summary: e.reason ?? e.action,
    createdAt: e.createdAt.toISOString(),
  }));
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function approveSample(...args: Parameters<typeof approveSample__impl>) {
  return guard(() => approveSample__impl(...args));
}

export async function createQcSample(...args: Parameters<typeof createQcSample__impl>) {
  return guard(() => createQcSample__impl(...args));
}

export async function deleteQcSample(...args: Parameters<typeof deleteQcSample__impl>) {
  return guard(() => deleteQcSample__impl(...args));
}

export async function getQcSampleAuditTrail(...args: Parameters<typeof getQcSampleAuditTrail__impl>) {
  return guard(() => getQcSampleAuditTrail__impl(...args));
}

export async function markCollected(...args: Parameters<typeof markCollected__impl>) {
  return guard(() => markCollected__impl(...args));
}

export async function markDisposed(...args: Parameters<typeof markDisposed__impl>) {
  return guard(() => markDisposed__impl(...args));
}

export async function markExpired(...args: Parameters<typeof markExpired__impl>) {
  return guard(() => markExpired__impl(...args));
}

export async function markLabReceived(...args: Parameters<typeof markLabReceived__impl>) {
  return guard(() => markLabReceived__impl(...args));
}

export async function markSentToLab(...args: Parameters<typeof markSentToLab__impl>) {
  return guard(() => markSentToLab__impl(...args));
}

export async function markTestingStarted(...args: Parameters<typeof markTestingStarted__impl>) {
  return guard(() => markTestingStarted__impl(...args));
}

export async function moveToRetention(...args: Parameters<typeof moveToRetention__impl>) {
  return guard(() => moveToRetention__impl(...args));
}

export async function recordLabTestResults(...args: Parameters<typeof recordLabTestResults__impl>) {
  return guard(() => recordLabTestResults__impl(...args));
}

export async function rejectSample(...args: Parameters<typeof rejectSample__impl>) {
  return guard(() => rejectSample__impl(...args));
}

export async function updateQcSample(...args: Parameters<typeof updateQcSample__impl>) {
  return guard(() => updateQcSample__impl(...args));
}

export async function updateRetentionRecord(...args: Parameters<typeof updateRetentionRecord__impl>) {
  return guard(() => updateRetentionRecord__impl(...args));
}
