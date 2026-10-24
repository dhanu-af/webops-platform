"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { computeCalculation, DIRECTION_LABEL } from "@/lib/capsule-calculation";
import type { CalculationDirection } from "@/app/generated/prisma/client";

const BASE_PATH = "/calculation";

// Same tier as Reports/Analytics/Audit Trail (lib/permissions.ts's
// "reports.view") -- a production-planning tool for the roles who plan
// batches, not a new permission of its own.
async function requireCalculationAccess() {
  const session = await auth();
  if (!session?.user) throw new UserFacingError("Not authenticated");
  requirePermission(session.user.role, "reports.view");
  return session.user;
}

export async function listCalculations() {
  return db.capsuleCalculation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  });
}

export async function listCalculationFolders() {
  return db.calculationFolder.findMany({ orderBy: { name: "asc" } });
}

async function createCalculationFolder__impl(name: string) {
  const actor = await requireCalculationAccess();
  const trimmed = name.trim();
  if (!trimmed) throw new UserFacingError("Folder name can't be empty.");

  const folder = await db.calculationFolder.create({ data: { name: trimmed, createdById: actor.id } });

  await logAudit({
    entityType: "CalculationFolder",
    entityId: folder.id,
    action: "CREATED",
    userId: actor.id,
    newValue: { name: trimmed },
  });

  revalidatePath(BASE_PATH);
  return folder.id;
}

async function deleteCalculationFolder__impl(id: string) {
  const actor = await requireCalculationAccess();
  const folder = await db.calculationFolder.delete({ where: { id } });

  await logAudit({
    entityType: "CalculationFolder",
    entityId: id,
    action: "DELETED",
    userId: actor.id,
    oldValue: { name: folder.name },
    reason: `Deleted the "${folder.name}" calculation folder — its calculations are now uncategorized, not deleted.`,
  });

  revalidatePath(BASE_PATH);
}

async function moveCalculationToFolder__impl(id: string, folderId: string | null) {
  const actor = await requireCalculationAccess();
  await db.capsuleCalculation.update({ where: { id }, data: { folderId } });

  await logAudit({
    entityType: "CapsuleCalculation",
    entityId: id,
    action: "EDITED",
    userId: actor.id,
    newValue: { folderId },
    reason: folderId ? "Moved a calculation into a folder" : "Moved a calculation out of its folder",
  });

  revalidatePath(BASE_PATH);
}

async function createCalculation__impl(data: {
  direction: CalculationDirection;
  label?: string | null;
  productName?: string | null;
  batchNumber?: string | null;
  capsulesPerBottle: number;
  avgWeightMg: number;
  inputValue: number;
}) {
  const actor = await requireCalculationAccess();
  if (!data.capsulesPerBottle || data.capsulesPerBottle <= 0) throw new UserFacingError("Capsules per bottle must be greater than 0.");
  if (!data.avgWeightMg || data.avgWeightMg <= 0) throw new UserFacingError("Weight must be greater than 0.");
  if (!data.inputValue || data.inputValue <= 0) throw new UserFacingError("Enter a value greater than 0.");

  const result = computeCalculation(data.direction, data.inputValue, data.capsulesPerBottle, data.avgWeightMg);

  const calc = await db.capsuleCalculation.create({
    data: {
      direction: data.direction,
      label: data.label?.trim() || null,
      productName: data.productName?.trim() || null,
      batchNumber: data.batchNumber?.trim() || null,
      capsulesPerBottle: data.capsulesPerBottle,
      avgWeightMg: data.avgWeightMg,
      inputValue: data.inputValue,
      resultKg: result.resultKg,
      resultCapsules: result.resultCapsules,
      resultBottles: result.resultBottles,
      createdById: actor.id,
    },
  });

  await logAudit({
    entityType: "CapsuleCalculation",
    entityId: calc.id,
    action: "CREATED",
    userId: actor.id,
    newValue: {
      direction: data.direction,
      label: data.label ?? null,
      productName: data.productName ?? null,
      batchNumber: data.batchNumber ?? null,
      inputValue: data.inputValue,
    },
  });

  revalidatePath(BASE_PATH);
  return calc.id;
}

async function updateCalculation__impl(
  id: string,
  data: {
    direction: CalculationDirection;
    label?: string | null;
    productName?: string | null;
    batchNumber?: string | null;
    capsulesPerBottle: number;
    avgWeightMg: number;
    inputValue: number;
  }
) {
  const actor = await requireCalculationAccess();
  if (!data.capsulesPerBottle || data.capsulesPerBottle <= 0) throw new UserFacingError("Capsules per bottle must be greater than 0.");
  if (!data.avgWeightMg || data.avgWeightMg <= 0) throw new UserFacingError("Weight must be greater than 0.");
  if (!data.inputValue || data.inputValue <= 0) throw new UserFacingError("Enter a value greater than 0.");

  const existing = await db.capsuleCalculation.findUniqueOrThrow({ where: { id } });
  const result = computeCalculation(data.direction, data.inputValue, data.capsulesPerBottle, data.avgWeightMg);

  await db.capsuleCalculation.update({
    where: { id },
    data: {
      direction: data.direction,
      label: data.label?.trim() || null,
      productName: data.productName?.trim() || null,
      batchNumber: data.batchNumber?.trim() || null,
      capsulesPerBottle: data.capsulesPerBottle,
      avgWeightMg: data.avgWeightMg,
      inputValue: data.inputValue,
      resultKg: result.resultKg,
      resultCapsules: result.resultCapsules,
      resultBottles: result.resultBottles,
    },
  });

  await logAudit({
    entityType: "CapsuleCalculation",
    entityId: id,
    action: "EDITED",
    userId: actor.id,
    oldValue: { direction: existing.direction, label: existing.label, productName: existing.productName, batchNumber: existing.batchNumber, inputValue: existing.inputValue },
    newValue: { direction: data.direction, label: data.label ?? null, productName: data.productName ?? null, batchNumber: data.batchNumber ?? null, inputValue: data.inputValue },
    reason: `Edited a "${DIRECTION_LABEL[data.direction]}" calculation${data.label ? ` ("${data.label}")` : ""}`,
  });

  revalidatePath(BASE_PATH);
}

async function deleteCalculation__impl(id: string) {
  const actor = await requireCalculationAccess();
  const calc = await db.capsuleCalculation.delete({ where: { id } });

  await logAudit({
    entityType: "CapsuleCalculation",
    entityId: id,
    action: "DELETED",
    userId: actor.id,
    oldValue: { direction: calc.direction, label: calc.label },
    reason: `Deleted a "${DIRECTION_LABEL[calc.direction]}" calculation${calc.label ? ` ("${calc.label}")` : ""}`,
  });

  revalidatePath(BASE_PATH);
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function createCalculation(...args: Parameters<typeof createCalculation__impl>) {
  return guard(() => createCalculation__impl(...args));
}

export async function createCalculationFolder(...args: Parameters<typeof createCalculationFolder__impl>) {
  return guard(() => createCalculationFolder__impl(...args));
}

export async function deleteCalculation(...args: Parameters<typeof deleteCalculation__impl>) {
  return guard(() => deleteCalculation__impl(...args));
}

export async function deleteCalculationFolder(...args: Parameters<typeof deleteCalculationFolder__impl>) {
  return guard(() => deleteCalculationFolder__impl(...args));
}

export async function moveCalculationToFolder(...args: Parameters<typeof moveCalculationToFolder__impl>) {
  return guard(() => moveCalculationToFolder__impl(...args));
}

export async function updateCalculation(...args: Parameters<typeof updateCalculation__impl>) {
  return guard(() => updateCalculation__impl(...args));
}
