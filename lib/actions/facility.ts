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

export async function createFacility(input: {
  name: string;
  code: string;
  address?: string;
}) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new Error("Facility name is required.");
  if (!code) throw new Error("Facility code is required.");

  const existing = await db.facility.findFirst({ where: { code } });
  if (existing)
    throw new Error(`A facility with code "${code}" already exists.`);

  const facility = await db.facility.create({
    data: { name, code, address: input.address?.trim() || undefined },
  });
  await logAudit({
    entityType: "Facility",
    entityId: facility.id,
    action: "CREATED",
    userId: actor.id,
    newValue: { name, code },
  });

  revalidatePath("/admin/areas");
}

export async function createSection(input: {
  facilityId: string;
  name: string;
  code: string;
}) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new Error("Section name is required.");
  if (!code) throw new Error("Section code is required.");

  const existing = await db.section.findFirst({
    where: { facilityId: input.facilityId, code },
  });
  if (existing)
    throw new Error(
      `A section with code "${code}" already exists in this facility.`,
    );

  const section = await db.section.create({
    data: { facilityId: input.facilityId, name, code },
  });
  await logAudit({
    entityType: "Section",
    entityId: section.id,
    action: "CREATED",
    userId: actor.id,
    newValue: { name, code, facilityId: input.facilityId },
  });

  revalidatePath("/admin/areas");
}

export async function renameFacility(facilityId: string, name: string) {
  const actor = await requireAreasManager();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Facility name is required.");

  const before = await db.facility.findUniqueOrThrow({
    where: { id: facilityId },
  });
  await db.facility.update({
    where: { id: facilityId },
    data: { name: trimmed },
  });
  await logAudit({
    entityType: "Facility",
    entityId: facilityId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { name: before.name },
    newValue: { name: trimmed },
    reason: "Renamed",
  });

  revalidatePath("/admin/areas");
}

export async function setFacilityArchived(
  facilityId: string,
  archived: boolean,
) {
  const actor = await requireAreasManager();

  await db.facility.update({ where: { id: facilityId }, data: { archived } });
  await logAudit({
    entityType: "Facility",
    entityId: facilityId,
    action: "EDITED",
    userId: actor.id,
    newValue: { archived },
    reason: archived ? "Archived" : "Restored",
  });

  revalidatePath("/admin/areas");
}

export async function renameSection(sectionId: string, name: string) {
  const actor = await requireAreasManager();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Section name is required.");

  const before = await db.section.findUniqueOrThrow({
    where: { id: sectionId },
  });
  await db.section.update({
    where: { id: sectionId },
    data: { name: trimmed },
  });
  await logAudit({
    entityType: "Section",
    entityId: sectionId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { name: before.name },
    newValue: { name: trimmed },
    reason: "Renamed",
  });

  revalidatePath("/admin/areas");
}

export async function setSectionArchived(sectionId: string, archived: boolean) {
  const actor = await requireAreasManager();

  await db.section.update({ where: { id: sectionId }, data: { archived } });
  await logAudit({
    entityType: "Section",
    entityId: sectionId,
    action: "EDITED",
    userId: actor.id,
    newValue: { archived },
    reason: archived ? "Archived" : "Restored",
  });

  revalidatePath("/admin/areas");
}

export async function createArea(input: {
  sectionId: string;
  name: string;
  code: string;
}) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new Error("Area name is required.");
  if (!code) throw new Error("Area code is required.");

  const existing = await db.area.findFirst({
    where: { sectionId: input.sectionId, code },
  });
  if (existing)
    throw new Error(
      `An area with code "${code}" already exists in this section.`,
    );

  const area = await db.area.create({
    data: { sectionId: input.sectionId, name, code },
  });
  await logAudit({
    entityType: "Area",
    entityId: area.id,
    action: "CREATED",
    userId: actor.id,
    newValue: { name, code, sectionId: input.sectionId },
  });

  revalidatePath("/admin/areas");
}

export async function createEquipment(input: {
  areaId: string;
  name: string;
  code: string;
  serialNumber?: string;
}) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new Error("Equipment name is required.");
  if (!code) throw new Error("Equipment code is required.");

  const existing = await db.equipment.findFirst({
    where: { areaId: input.areaId, code },
  });
  if (existing)
    throw new Error(
      `Equipment with code "${code}" already exists in this area.`,
    );

  const equipment = await db.equipment.create({
    data: {
      areaId: input.areaId,
      name,
      code,
      serialNumber: input.serialNumber?.trim() || undefined,
    },
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

export async function renameArea(areaId: string, name: string) {
  const actor = await requireAreasManager();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Area name is required.");

  const before = await db.area.findUniqueOrThrow({ where: { id: areaId } });
  await db.area.update({ where: { id: areaId }, data: { name: trimmed } });
  await logAudit({
    entityType: "Area",
    entityId: areaId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { name: before.name },
    newValue: { name: trimmed },
    reason: "Renamed",
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

export async function renameEquipment(equipmentId: string, name: string) {
  const actor = await requireAreasManager();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Equipment name is required.");

  const before = await db.equipment.findUniqueOrThrow({
    where: { id: equipmentId },
  });
  await db.equipment.update({
    where: { id: equipmentId },
    data: { name: trimmed },
  });
  await logAudit({
    entityType: "Equipment",
    entityId: equipmentId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { name: before.name },
    newValue: { name: trimmed },
    reason: "Renamed",
  });

  revalidatePath("/admin/areas");
}

export async function setEquipmentArchived(
  equipmentId: string,
  archived: boolean,
) {
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
