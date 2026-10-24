"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session-user";
import { logAudit } from "@/lib/audit";
import { DEFAULT_PACKAGING_ISSUE_LINES, DEFAULT_PACKAGING_MATERIAL_LINES, canEditMfgStage, type MfgStageKey } from "@/lib/mfg-reconciliation";
import { getUserAreaNames } from "@/lib/data/mfg-reconciliation";
import type { MfgMaterialGroup, MfgPackagingMaterialType } from "@/app/generated/prisma/client";

const BASE_PATH = "/mfg-reconciliation";

// Batch-level actions (create/delete/mark completed) stay restricted to the
// full mfg.manage tier -- an operator who can edit their own section's
// stage still can't create or delete a whole batch, or mark it complete.
async function requireAccess() {
  return requireLiveUser("mfg.manage");
}

// Per-stage save actions: mfg.manage roles can always edit; an
// OPERATOR/TEAM_LEADER can only edit the one stage matching their own
// assigned Area (see canEditMfgStage in lib/mfg-reconciliation.ts).
async function requireStageAccess(stage: MfgStageKey) {
  const user = await requireLiveUser();
  const areaNames = await getUserAreaNames(user.areaIds);
  if (!canEditMfgStage(user.role, areaNames, stage)) {
    throw new UserFacingError("Forbidden: you don't have edit access to this stage.");
  }
  return user;
}

// Creates the batch plus its Warehouse Issue and Packaging stages
// pre-populated with the standard packaging material lines (same idea as a
// checklist pre-populating its items from a template). The other five
// stages are created lazily by their own save* action the first time that
// stage is filled in.
async function createMfgBatch__impl(data: { batchNumber: string; productName: string; formulationReference: string | null }) {
  const actor = await requireAccess();
  if (!data.batchNumber || !data.productName) throw new UserFacingError("Batch number and product name are required.");

  const batch = await db.mfgBatch.create({
    data: {
      batchNumber: data.batchNumber,
      productName: data.productName,
      formulationReference: data.formulationReference?.trim() || null,
      createdById: actor.id,
      warehouseIssue: {
        create: { lines: { create: DEFAULT_PACKAGING_ISSUE_LINES.map((line, i) => ({ ...line, sortOrder: i })) } },
      },
      packaging: {
        create: { lines: { create: DEFAULT_PACKAGING_MATERIAL_LINES.map((materialType, i) => ({ materialType, sortOrder: i })) } },
      },
    },
  });

  await logAudit({
    entityType: "MfgBatch",
    entityId: batch.id,
    action: "CREATED",
    userId: actor.id,
    reason: `Manufacturing batch ${batch.batchNumber} (${batch.productName}) created`,
    newValue: { batchNumber: batch.batchNumber, productName: batch.productName },
  });

  revalidatePath(BASE_PATH);
  return batch.id;
}

async function deleteMfgBatch__impl(id: string) {
  const actor = await requireAccess();
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id } });

  await db.mfgBatch.delete({ where: { id } });

  await logAudit({
    entityType: "MfgBatch",
    entityId: id,
    action: "DELETED",
    userId: actor.id,
    reason: `Deleted manufacturing batch ${batch.batchNumber}`,
  });

  revalidatePath(BASE_PATH);
}

async function markMfgBatchCompleted__impl(id: string) {
  const actor = await requireAccess();
  const batch = await db.mfgBatch.update({ where: { id }, data: { status: "COMPLETED" } });

  await logAudit({
    entityType: "MfgBatch",
    entityId: id,
    action: "EDITED",
    userId: actor.id,
    reason: `Manufacturing batch ${batch.batchNumber} marked completed`,
  });

  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
}

type MaterialIssueLineInput = {
  materialGroup: MfgMaterialGroup;
  materialCode: string | null;
  description: string;
  supplier: string | null;
  lotBatchNumber: string | null;
  expiryDate: string | null;
  quantityRequested: number | null;
  quantityIssued: number | null;
  quantityReturned: number | null;
};

// Replaces the Warehouse Issue header + all material lines wholesale -- the
// row set is edited as a whole table in the UI, not patched row-by-row.
async function saveWarehouseIssue__impl(
  batchId: string,
  header: { issuedByName: string | null; issueDate: string | null; remarks: string | null },
  lines: MaterialIssueLineInput[]
) {
  const actor = await requireStageAccess("warehouseIssue");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  await db.$transaction(async (tx) => {
    const issue = await tx.mfgWarehouseIssue.upsert({
      where: { mfgBatchId: batchId },
      create: { mfgBatchId: batchId, issuedByName: header.issuedByName, issueDate: header.issueDate ? new Date(header.issueDate) : null, remarks: header.remarks },
      update: { issuedByName: header.issuedByName, issueDate: header.issueDate ? new Date(header.issueDate) : null, remarks: header.remarks },
    });
    await tx.mfgMaterialIssueLine.deleteMany({ where: { warehouseIssueId: issue.id } });
    await tx.mfgMaterialIssueLine.createMany({
      data: lines.map((line, i) => ({
        warehouseIssueId: issue.id,
        materialGroup: line.materialGroup,
        materialCode: line.materialCode,
        description: line.description,
        supplier: line.supplier,
        lotBatchNumber: line.lotBatchNumber,
        expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
        quantityRequested: line.quantityRequested,
        quantityIssued: line.quantityIssued,
        quantityReturned: line.quantityReturned,
        sortOrder: i,
      })),
    });
  });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "EDITED", userId: actor.id, reason: `Warehouse Issue saved for batch ${batch.batchNumber} (${lines.length} line(s))` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

type BlendingInput = {
  totalTheoreticalWeightKg: number | null;
  actualWeightKg: number | null;
  blendBatchNumber: string | null;
  powderRemainingKg: number | null;
  blenderResidueKg: number | null;
  sieveLossKg: number | null;
  dustLossKg: number | null;
  spillagesKg: number | null;
  qcSamplesQty: number | null;
  retentionSamplesQty: number | null;
  destroyedMaterialKg: number | null;
  returnedToWarehouseKg: number | null;
  totalBlendProducedKg: number | null;
  blendedByName: string | null;
  blendedAt: string | null;
  remarks: string | null;
};

async function saveBlending__impl(batchId: string, data: BlendingInput) {
  const actor = await requireStageAccess("blending");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  const values = { ...data, blendedAt: data.blendedAt ? new Date(data.blendedAt) : null };
  await db.mfgBlending.upsert({ where: { mfgBatchId: batchId }, create: { mfgBatchId: batchId, ...values }, update: values });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "EDITED", userId: actor.id, reason: `Blending stage saved for batch ${batch.batchNumber}` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

// Mirrors the real "CAPSULE RECONCILIATION" form's raw input cells -- see
// MfgEncapsulation in schema.prisma.
type EncapsulationInput = {
  targetCapsuleFillWeightMg: number | null;
  avgCapsuleFullWeightMg: number | null;
  issuedBulkBlendKg: number | null;
  capsulesProducedKg: number | null;
  capsuleSamplesKg: number | null;
  rejectCapsulesKg: number | null;
  rejectPowderKg: number | null;
  avgCapsuleFillWeightMg: number | null;
  avgCapsuleLengthMm: number | null;
  avgDisintegrationMinutes: number | null;
  avgDisintegrationSeconds: number | null;
  disintegrationResult: string | null;
  completedByName: string | null;
  completedAt: string | null;
  checkedByName: string | null;
  checkedAt: string | null;
  comments: string | null;
};

async function saveEncapsulation__impl(batchId: string, data: EncapsulationInput) {
  const actor = await requireStageAccess("encapsulation");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  const values = { ...data, completedAt: data.completedAt ? new Date(data.completedAt) : null, checkedAt: data.checkedAt ? new Date(data.checkedAt) : null };
  await db.mfgEncapsulation.upsert({ where: { mfgBatchId: batchId }, create: { mfgBatchId: batchId, ...values }, update: values });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "EDITED", userId: actor.id, reason: `Encapsulation stage saved for batch ${batch.batchNumber}` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

// Mirrors the real "BOTTLE RECONCILIATION" form's raw input cells -- see
// MfgBottling in schema.prisma.
type BottlingInput = {
  totalCapsuleBulkWeightKg: number | null;
  avgCapsuleFullWeightMg: number | null;
  plannedQuantityBottles: number | null;
  capsuleReceivedKg: number | null;
  bottlesProduced: number | null;
  bottleUsed: number | null;
  desiccantsUsed: number | null;
  capsUsed: number | null;
  targetCapsulesPerBottle: number | null;
  completedByName: string | null;
  completedAt: string | null;
  checkedByName: string | null;
  checkedAt: string | null;
  comments: string | null;
};

async function saveBottling__impl(batchId: string, data: BottlingInput) {
  const actor = await requireStageAccess("bottling");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  const values = { ...data, completedAt: data.completedAt ? new Date(data.completedAt) : null, checkedAt: data.checkedAt ? new Date(data.checkedAt) : null };
  await db.mfgBottling.upsert({ where: { mfgBatchId: batchId }, create: { mfgBatchId: batchId, ...values }, update: values });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "EDITED", userId: actor.id, reason: `Bottling stage saved for batch ${batch.batchNumber}` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

type XrayInspectionInput = {
  bottlesReceived: number | null;
  bottlesScanned: number | null;
  passed: number | null;
  failed: number | null;
  reworked: number | null;
  destroyed: number | null;
  released: number | null;
  rejectMetalDetection: number | null;
  rejectXrayFailure: number | null;
  rejectUnderweight: number | null;
  rejectOverweight: number | null;
  rejectDamagedBottle: number | null;
  rejectMissingCap: number | null;
  rejectMissingDesiccant: number | null;
  inspectedByName: string | null;
  inspectedAt: string | null;
  remarks: string | null;
};

async function saveXrayInspection__impl(batchId: string, data: XrayInspectionInput) {
  const actor = await requireStageAccess("xray");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  const values = { ...data, inspectedAt: data.inspectedAt ? new Date(data.inspectedAt) : null };
  await db.mfgXrayInspection.upsert({ where: { mfgBatchId: batchId }, create: { mfgBatchId: batchId, ...values }, update: values });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "EDITED", userId: actor.id, reason: `X-Ray/Metal Detection stage saved for batch ${batch.batchNumber}` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

type PackagingMaterialLineInput = { materialType: MfgPackagingMaterialType; issued: number | null; used: number | null; damaged: number | null; returned: number | null; destroyed: number | null };

async function savePackaging__impl(
  batchId: string,
  header: { packedBottles: number | null; cartonsProduced: number | null; casesProduced: number | null; packedByName: string | null; packedAt: string | null; remarks: string | null },
  lines: PackagingMaterialLineInput[]
) {
  const actor = await requireStageAccess("packaging");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  await db.$transaction(async (tx) => {
    const packaging = await tx.mfgPackaging.upsert({
      where: { mfgBatchId: batchId },
      create: { mfgBatchId: batchId, ...header, packedAt: header.packedAt ? new Date(header.packedAt) : null },
      update: { ...header, packedAt: header.packedAt ? new Date(header.packedAt) : null },
    });
    await tx.mfgPackagingMaterialLine.deleteMany({ where: { packagingId: packaging.id } });
    await tx.mfgPackagingMaterialLine.createMany({ data: lines.map((line, i) => ({ packagingId: packaging.id, ...line, sortOrder: i })) });
  });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "EDITED", userId: actor.id, reason: `Packaging stage saved for batch ${batch.batchNumber}` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

type FinishedGoodsWarehouseInput = {
  finishedGoodsReceived: number | null;
  qaReleased: boolean;
  qaReleasedByName: string | null;
  qaReleasedAt: string | null;
  storageLocation: string | null;
  warehouseBalance: number | null;
  batchNumber: string | null;
  expiryDate: string | null;
  remarks: string | null;
};

async function saveFinishedGoodsWarehouse__impl(batchId: string, data: FinishedGoodsWarehouseInput) {
  const actor = await requireStageAccess("fgWarehouse");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  const values = { ...data, qaReleasedAt: data.qaReleasedAt ? new Date(data.qaReleasedAt) : null, expiryDate: data.expiryDate ? new Date(data.expiryDate) : null };
  await db.mfgFinishedGoodsWarehouse.upsert({ where: { mfgBatchId: batchId }, create: { mfgBatchId: batchId, ...values }, update: values });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "EDITED", userId: actor.id, reason: `Finished Goods Warehouse stage saved for batch ${batch.batchNumber}` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

type DispatchEventInput = {
  customer: string;
  salesOrder: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  casesDispatched: number | null;
  bottlesDispatched: number | null;
  dispatchDate: string | null;
  remainingStockAfter: number | null;
  remarks: string | null;
};

async function addDispatchEvent__impl(batchId: string, data: DispatchEventInput) {
  const actor = await requireStageAccess("dispatch");
  if (!data.customer) throw new UserFacingError("Customer is required.");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  await db.mfgDispatchEvent.create({
    data: {
      mfgBatchId: batchId,
      customer: data.customer,
      salesOrder: data.salesOrder,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      casesDispatched: data.casesDispatched,
      bottlesDispatched: data.bottlesDispatched,
      dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : null,
      remainingStockAfter: data.remainingStockAfter,
      dispatchedByName: actor.name,
      remarks: data.remarks,
    },
  });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "CREATED", userId: actor.id, reason: `Dispatch recorded for batch ${batch.batchNumber} to ${data.customer}` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

async function deleteDispatchEvent__impl(batchId: string, dispatchEventId: string) {
  const actor = await requireStageAccess("dispatch");
  const batch = await db.mfgBatch.findUniqueOrThrow({ where: { id: batchId } });

  await db.mfgDispatchEvent.delete({ where: { id: dispatchEventId } });

  await logAudit({ entityType: "MfgBatch", entityId: batchId, action: "DELETED", userId: actor.id, reason: `Dispatch event removed for batch ${batch.batchNumber}` });
  revalidatePath(`${BASE_PATH}/${batchId}`);
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function addDispatchEvent(...args: Parameters<typeof addDispatchEvent__impl>) {
  return guard(() => addDispatchEvent__impl(...args));
}

export async function createMfgBatch(...args: Parameters<typeof createMfgBatch__impl>) {
  return guard(() => createMfgBatch__impl(...args));
}

export async function deleteDispatchEvent(...args: Parameters<typeof deleteDispatchEvent__impl>) {
  return guard(() => deleteDispatchEvent__impl(...args));
}

export async function deleteMfgBatch(...args: Parameters<typeof deleteMfgBatch__impl>) {
  return guard(() => deleteMfgBatch__impl(...args));
}

export async function markMfgBatchCompleted(...args: Parameters<typeof markMfgBatchCompleted__impl>) {
  return guard(() => markMfgBatchCompleted__impl(...args));
}

export async function saveBlending(...args: Parameters<typeof saveBlending__impl>) {
  return guard(() => saveBlending__impl(...args));
}

export async function saveBottling(...args: Parameters<typeof saveBottling__impl>) {
  return guard(() => saveBottling__impl(...args));
}

export async function saveEncapsulation(...args: Parameters<typeof saveEncapsulation__impl>) {
  return guard(() => saveEncapsulation__impl(...args));
}

export async function saveFinishedGoodsWarehouse(...args: Parameters<typeof saveFinishedGoodsWarehouse__impl>) {
  return guard(() => saveFinishedGoodsWarehouse__impl(...args));
}

export async function savePackaging(...args: Parameters<typeof savePackaging__impl>) {
  return guard(() => savePackaging__impl(...args));
}

export async function saveWarehouseIssue(...args: Parameters<typeof saveWarehouseIssue__impl>) {
  return guard(() => saveWarehouseIssue__impl(...args));
}

export async function saveXrayInspection(...args: Parameters<typeof saveXrayInspection__impl>) {
  return guard(() => saveXrayInspection__impl(...args));
}
