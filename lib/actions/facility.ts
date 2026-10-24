"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath, updateTag } from "next/cache";
import { FACILITY_TAG } from "@/lib/cached-config";

async function requireAreasManager() {
  const session = await auth();
  if (!session?.user) throw new UserFacingError("Not authenticated");
  requirePermission(session.user.role, "areas.manage");
  return session.user;
}

async function createFacility__impl(input: {
  name: string;
  code: string;
  address?: string;
}) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new UserFacingError("Facility name is required.");
  if (!code) throw new UserFacingError("Facility code is required.");

  const existing = await db.facility.findFirst({ where: { code } });
  if (existing)
    throw new UserFacingError(`A facility with code "${code}" already exists.`);

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

  updateTag(FACILITY_TAG);

  revalidatePath("/admin/areas");
}

async function createSection__impl(input: {
  facilityId: string;
  name: string;
  code: string;
}) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new UserFacingError("Section name is required.");
  if (!code) throw new UserFacingError("Section code is required.");

  const existing = await db.section.findFirst({
    where: { facilityId: input.facilityId, code },
  });
  if (existing)
    throw new UserFacingError(
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

async function renameFacility__impl(facilityId: string, name: string) {
  const actor = await requireAreasManager();

  const trimmed = name.trim();
  if (!trimmed) throw new UserFacingError("Facility name is required.");

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

  updateTag(FACILITY_TAG);

  revalidatePath("/admin/areas");
}

async function setFacilityArchived__impl(
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

  updateTag(FACILITY_TAG);

  revalidatePath("/admin/areas");
}

async function renameSection__impl(sectionId: string, name: string) {
  const actor = await requireAreasManager();

  const trimmed = name.trim();
  if (!trimmed) throw new UserFacingError("Section name is required.");

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

async function setSectionArchived__impl(sectionId: string, archived: boolean) {
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

async function createArea__impl(input: {
  sectionId: string;
  name: string;
  code: string;
}) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new UserFacingError("Area name is required.");
  if (!code) throw new UserFacingError("Area code is required.");

  const existing = await db.area.findFirst({
    where: { sectionId: input.sectionId, code },
  });
  if (existing)
    throw new UserFacingError(
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

async function createEquipment__impl(input: {
  areaId: string;
  name: string;
  code: string;
  serialNumber?: string;
}) {
  const actor = await requireAreasManager();

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) throw new UserFacingError("Equipment name is required.");
  if (!code) throw new UserFacingError("Equipment code is required.");

  const existing = await db.equipment.findFirst({
    where: { areaId: input.areaId, code },
  });
  if (existing)
    throw new UserFacingError(
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

async function renameArea__impl(areaId: string, name: string) {
  const actor = await requireAreasManager();

  const trimmed = name.trim();
  if (!trimmed) throw new UserFacingError("Area name is required.");

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

async function setAreaArchived__impl(areaId: string, archived: boolean) {
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

async function renameEquipment__impl(equipmentId: string, name: string) {
  const actor = await requireAreasManager();

  const trimmed = name.trim();
  if (!trimmed) throw new UserFacingError("Equipment name is required.");

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

async function setEquipmentArchived__impl(
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

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function createArea(...args: Parameters<typeof createArea__impl>) {
  return guard(() => createArea__impl(...args));
}

export async function createEquipment(...args: Parameters<typeof createEquipment__impl>) {
  return guard(() => createEquipment__impl(...args));
}

export async function createFacility(...args: Parameters<typeof createFacility__impl>) {
  return guard(() => createFacility__impl(...args));
}

export async function createSection(...args: Parameters<typeof createSection__impl>) {
  return guard(() => createSection__impl(...args));
}

export async function renameArea(...args: Parameters<typeof renameArea__impl>) {
  return guard(() => renameArea__impl(...args));
}

export async function renameEquipment(...args: Parameters<typeof renameEquipment__impl>) {
  return guard(() => renameEquipment__impl(...args));
}

export async function renameFacility(...args: Parameters<typeof renameFacility__impl>) {
  return guard(() => renameFacility__impl(...args));
}

export async function renameSection(...args: Parameters<typeof renameSection__impl>) {
  return guard(() => renameSection__impl(...args));
}

export async function setAreaArchived(...args: Parameters<typeof setAreaArchived__impl>) {
  return guard(() => setAreaArchived__impl(...args));
}

export async function setEquipmentArchived(...args: Parameters<typeof setEquipmentArchived__impl>) {
  return guard(() => setEquipmentArchived__impl(...args));
}

export async function setFacilityArchived(...args: Parameters<typeof setFacilityArchived__impl>) {
  return guard(() => setFacilityArchived__impl(...args));
}

export async function setSectionArchived(...args: Parameters<typeof setSectionArchived__impl>) {
  return guard(() => setSectionArchived__impl(...args));
}
