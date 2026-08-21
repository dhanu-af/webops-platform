"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireAreasManager() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requirePermission(session.user.role, "areas.manage");
  return session.user;
}

export async function createArea(input: { sectionId: string; name: string; code: string }) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new Error("Area name is required.");
  if (!code) throw new Error("Area code is required.");

  const existing = await db.area.findFirst({ where: { sectionId: input.sectionId, code } });
  if (existing) throw new Error(`An area with code "${code}" already exists in this section.`);

  const area = await db.area.create({ data: { sectionId: input.sectionId, name, code } });
  await logAudit({ entityType: "Area", entityId: area.id, action: "CREATED", userId: actor.id, newValue: { name, code, sectionId: input.sectionId } });

  revalidatePath("/admin/areas");
}

export async function createEquipment(input: { areaId: string; name: string; code: string; serialNumber?: string }) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new Error("Equipment name is required.");
  if (!code) throw new Error("Equipment code is required.");

  const existing = await db.equipment.findFirst({ where: { areaId: input.areaId, code } });
  if (existing) throw new Error(`Equipment with code "${code}" already exists in this area.`);

  const equipment = await db.equipment.create({
    data: { areaId: input.areaId, name, code, serialNumber: input.serialNumber?.trim() || undefined },
  });
  await logAudit({
    entityType: "Equipment",
    entityId: equipment.id,
    action: "CREATED",
    userId: actor.id,
    newValue: { name, code, areaId: input.areaId },
  });

  revalidatePath("/admin/areas");
}

export async function setAreaArchived(areaId: string, archived: boolean) {
  const actor = await requireAreasManager();

  await db.area.update({ where: { id: areaId }, data: { archived } });
  await logAudit({
    entityType: "Area",
    entityId: areaId,
    action: "EDITED",
    userId: actor.id,
    newValue: { archived },
    reason: archived ? "Archived" : "Restored",
  });

  revalidatePath("/admin/areas");
}

export async function setEquipmentArchived(equipmentId: string, archived: boolean) {
  const actor = await requireAreasManager();

  await db.equipment.update({ where: { id: equipmentId }, data: { archived } });
  await logAudit({
    entityType: "Equipment",
    entityId: equipmentId,
    action: "EDITED",
    userId: actor.id,
    newValue: { archived },
    reason: archived ? "Archived" : "Restored",
  });

  revalidatePath("/admin/areas");
}
