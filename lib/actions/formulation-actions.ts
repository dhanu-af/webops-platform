"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

const BASE_PATH = "/formulations";

async function requireEditor() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorized");
  requirePermission(session.user.role, "formulation.manage");
  return session;
}

export type IngredientInput = {
  rmNumber?: string | null;
  ingredientName: string;
  uin?: string | null;
  baseQty: number;
  tolerancePct: number;
  controlStatus?: string | null;
  changeControlRef?: string | null;
  approvedBy?: string | null;
  comments?: string | null;
};

export async function createFolder(name: string) {
  const session = await requireEditor();
  if (!name.trim()) throw new Error("Folder name can't be empty");

  const count = await db.formulationFolder.count();
  const folder = await db.formulationFolder.create({
    data: { name: name.trim(), order: count },
  });

  await logAudit({
    entityType: "FormulationFolder",
    entityId: folder.id,
    action: "CREATED",
    userId: session.user.id,
  });

  revalidatePath(BASE_PATH);
  return folder;
}

export async function deleteFolder(id: string) {
  const session = await requireEditor();

  const count = await db.formulation.count({ where: { folderId: id } });
  if (count > 0) throw new Error("This folder still has formulations in it — move or delete them first");

  await db.formulationFolder.delete({ where: { id } });

  await logAudit({
    entityType: "FormulationFolder",
    entityId: id,
    action: "DELETED",
    userId: session.user.id,
  });

  revalidatePath(BASE_PATH);
}

export async function createFormulation(data: {
  folderId: string;
  productName: string;
  baseUnit: string;
  ingredients: IngredientInput[];
}) {
  const session = await requireEditor();
  if (!data.productName.trim()) throw new Error("Product name is required");
  if (data.ingredients.length === 0) throw new Error("Add at least one ingredient");

  // baseBatchSize is never entered directly -- it's the sum of every
  // ingredient's baseQty, computed here at save time.
  const baseBatchSize = data.ingredients.reduce((s, i) => s + (Number(i.baseQty) || 0), 0);

  const formulation = await db.formulation.create({
    data: {
      folderId: data.folderId,
      productName: data.productName.trim(),
      baseBatchSize,
      baseUnit: data.baseUnit || "kg",
      createdById: session.user.id,
      createdByName: session.user.name,
      ingredients: {
        create: data.ingredients.map((ing, i) => ({
          order: i,
          rmNumber: ing.rmNumber || null,
          ingredientName: ing.ingredientName,
          uin: ing.uin || null,
          baseQty: Number(ing.baseQty) || 0,
          tolerancePct: Number(ing.tolerancePct) || 0,
          controlStatus: ing.controlStatus || null,
          changeControlRef: ing.changeControlRef || null,
          approvedBy: ing.approvedBy || null,
          comments: ing.comments || null,
        })),
      },
    },
  });

  await logAudit({
    entityType: "Formulation",
    entityId: formulation.id,
    action: "CREATED",
    userId: session.user.id,
  });

  revalidatePath(BASE_PATH);
  return formulation;
}

export async function updateFormulation(
  id: string,
  data: {
    folderId: string;
    productName: string;
    baseUnit: string;
    ingredients: IngredientInput[];
  }
) {
  const session = await requireEditor();
  if (!data.productName.trim()) throw new Error("Product name is required");
  if (data.ingredients.length === 0) throw new Error("Add at least one ingredient");

  const baseBatchSize = data.ingredients.reduce((s, i) => s + (Number(i.baseQty) || 0), 0);

  // Rows are always fully re-submitted from the form, so replacing them
  // wholesale in a transaction is the simplest correct approach -- no need
  // to diff against what's already stored.
  await db.$transaction([
    db.formulationIngredient.deleteMany({ where: { formulationId: id } }),
    db.formulation.update({
      where: { id },
      data: {
        folderId: data.folderId,
        productName: data.productName.trim(),
        baseBatchSize,
        baseUnit: data.baseUnit || "kg",
        ingredients: {
          create: data.ingredients.map((ing, i) => ({
            order: i,
            rmNumber: ing.rmNumber || null,
            ingredientName: ing.ingredientName,
            uin: ing.uin || null,
            baseQty: Number(ing.baseQty) || 0,
            tolerancePct: Number(ing.tolerancePct) || 0,
            controlStatus: ing.controlStatus || null,
            changeControlRef: ing.changeControlRef || null,
            approvedBy: ing.approvedBy || null,
            comments: ing.comments || null,
          })),
        },
      },
    }),
  ]);

  await logAudit({
    entityType: "Formulation",
    entityId: id,
    action: "EDITED",
    userId: session.user.id,
  });

  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
}

export async function deleteFormulation(id: string) {
  const session = await requireEditor();

  await db.formulation.delete({ where: { id } });

  await logAudit({
    entityType: "Formulation",
    entityId: id,
    action: "DELETED",
    userId: session.user.id,
  });

  revalidatePath(BASE_PATH);
}
