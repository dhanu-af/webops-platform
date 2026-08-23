"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission, can } from "@/lib/permissions";
import { formatSampleId } from "@/lib/qc-sample-defaults";
import type { QcSampleType, QcProductCategory, QcTestResult } from "@/app/generated/prisma/client";

const BASE_PATH = "/qc-samples";

async function requireManageAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requirePermission(session.user.role, "qc.manage");
  return session.user;
}

async function requireCollectAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requirePermission(session.user.role, "qc.collect");
  return session.user;
}

async function requireLabAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requirePermission(session.user.role, "qc.lab");
  return session.user;
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

export async function createQcSample(data: NewQcSample) {
  const actor = await requireCollectAccess();
  if (!data.productName || !data.batchNumber || !data.sampleType || !data.unit) {
    throw new Error("Product, batch number, sample type, and unit are required");
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

export async function updateQcSample(id: string, data: NewQcSample) {
  const actor = await requireManageAccess();
  if (!data.productName || !data.batchNumber || !data.sampleType || !data.unit) {
    throw new Error("Product, batch number, sample type, and unit are required");
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
  });

  revalidatePath(BASE_PATH);
}

export async function markCollected(id: string) {
  const actor = await requireCollectAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "WAITING_COLLECTION") throw new Error("Sample is not waiting collection");

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

export async function markSentToLab(
  id: string,
  data: { sentDate: string; courierOrInternal: string | null; laboratoryName: string | null; laboratoryLocation: string | null }
) {
  const actor = await requireCollectAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "COLLECTED") throw new Error("Sample must be collected before it can be sent to the lab");

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

export async function markLabReceived(id: string) {
  const actor = await requireLabAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "WAITING_LAB") throw new Error("Sample has not been sent to the lab yet");

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

export async function markTestingStarted(id: string) {
  const actor = await requireLabAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "IN_LABORATORY") throw new Error("Sample must be received at the laboratory first");

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
export async function recordLabTestResults(id: string, items: LabTestItemInput[]) {
  const actor = await requireLabAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "TESTING" && sample.status !== "IN_LABORATORY") {
    throw new Error("Sample must be in the laboratory before test results can be recorded");
  }
  if (!sample.productCategory) {
    throw new Error("Set a Product Category on the sample record before recording test results");
  }

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
    reason: `Lab test results recorded for sample ${sample.sampleId}`,
  });

  revalidatePath(BASE_PATH);
}

export async function approveSample(id: string) {
  const actor = await requireLabAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "WAITING_RESULTS") throw new Error("Sample is not awaiting a result");

  await db.qcSample.update({ where: { id }, data: { status: "APPROVED" } });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "QC_APPROVED",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} approved`,
  });

  revalidatePath(BASE_PATH);
}

export async function rejectSample(id: string, reason: string) {
  const actor = await requireLabAccess();
  if (!reason) throw new Error("A rejection reason is required");
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "WAITING_RESULTS") throw new Error("Sample is not awaiting a result");

  await db.qcSample.update({
    where: { id },
    data: { status: "REJECTED", remarks: [sample.remarks, `Rejected: ${reason}`].filter(Boolean).join("\n") },
  });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "REJECTED",
    userId: actor.id,
    reason: `Sample ${sample.sampleId} rejected: ${reason}`,
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

export async function moveToRetention(id: string, data: RetentionInput) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "APPROVED") throw new Error("Only an approved sample can move to retention");

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

export async function updateRetentionRecord(
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

export async function markExpired(id: string) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  if (sample.status !== "RETENTION") throw new Error("Only a retained sample can be marked expired");

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

export async function markDisposed(id: string) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id }, include: { retentionRecord: true } });
  if (sample.status !== "RETENTION" && sample.status !== "EXPIRED") {
    throw new Error("Only a retained or expired sample can be disposed");
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
export async function deleteQcSample(id: string) {
  const actor = await requireManageAccess();
  const sample = await db.qcSample.findUniqueOrThrow({ where: { id } });
  const isForce = actor.role === "SUPER_ADMIN";

  if (!isForce && sample.status !== "WAITING_COLLECTION" && sample.status !== "COLLECTED") {
    throw new Error("Can't delete — this sample already has lab or retention history. A Super Admin can force-delete it.");
  }

  await db.qcSample.delete({ where: { id } });

  await logAudit({
    entityType: "QcSample",
    entityId: id,
    action: "DELETED",
    userId: actor.id,
    reason:
      isForce && sample.status !== "WAITING_COLLECTION" && sample.status !== "COLLECTED"
        ? `Force-deleted sample ${sample.sampleId} (${sample.status}) — lab/retention history removed`
        : `Deleted sample ${sample.sampleId} (never sent to lab)`,
  });

  revalidatePath(BASE_PATH);
}

export async function getQcSampleAuditTrail(sampleId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (!can(session.user.role, "view")) throw new Error("Not authorized");

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
