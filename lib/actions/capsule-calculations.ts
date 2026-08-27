"use server";

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
  if (!session?.user) throw new Error("Not authenticated");
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

export async function createCalculation(data: {
  direction: CalculationDirection;
  label?: string | null;
  productName?: string | null;
  batchNumber?: string | null;
  capsulesPerBottle: number;
  avgWeightMg: number;
  inputValue: number;
}) {
  const actor = await requireCalculationAccess();
  if (!data.capsulesPerBottle || data.capsulesPerBottle <= 0) throw new Error("Capsules per bottle must be greater than 0.");
  if (!data.avgWeightMg || data.avgWeightMg <= 0) throw new Error("Weight must be greater than 0.");
  if (!data.inputValue || data.inputValue <= 0) throw new Error("Enter a value greater than 0.");

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

export async function updateCalculation(
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
  if (!data.capsulesPerBottle || data.capsulesPerBottle <= 0) throw new Error("Capsules per bottle must be greater than 0.");
  if (!data.avgWeightMg || data.avgWeightMg <= 0) throw new Error("Weight must be greater than 0.");
  if (!data.inputValue || data.inputValue <= 0) throw new Error("Enter a value greater than 0.");

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

export async function deleteCalculation(id: string) {
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
