"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { storePhoto, isAllowedPhotoFile } from "@/lib/storage";
import type { NotificationType } from "@/app/generated/prisma/client";

async function requireSettingsManager() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  // Facility-wide configuration is the same tier as Areas & Equipment —
  // both describe the physical/organisational structure, not day-to-day ops.
  requirePermission(session.user.role, "areas.manage");
  return session.user;
}

export async function updateFacilityTimezone(facilityId: string, timezone: string) {
  const actor = await requireSettingsManager();

  if (!Intl.supportedValuesOf("timeZone").includes(timezone)) {
    throw new Error(`"${timezone}" is not a recognised IANA timezone.`);
  }

  const facility = await db.facility.findUniqueOrThrow({ where: { id: facilityId } });
  if (facility.timezone === timezone) return;

  await db.facility.update({ where: { id: facilityId }, data: { timezone } });
  await logAudit({
    entityType: "Facility",
    entityId: facilityId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { timezone: facility.timezone },
    newValue: { timezone },
  });

  revalidatePath("/admin/settings");
}

async function getOrCreateSettings() {
  return (await db.systemSettings.findFirst()) ?? (await db.systemSettings.create({ data: {} }));
}

export async function updateBranding(formData: FormData) {
  const actor = await requireSettingsManager();

  const organizationName = ((formData.get("organizationName") as string) || "").trim() || null;
  const logoFile = formData.get("logo") as File | null;

  const existing = await getOrCreateSettings();
  let logoUrl = existing.logoUrl;
  if (logoFile && logoFile.size > 0) {
    if (!isAllowedPhotoFile(logoFile)) throw new Error("Unsupported image type for logo — use JPEG, PNG, WebP, or HEIC.");
    logoUrl = (await storePhoto(logoFile)).url;
  }

  await db.systemSettings.update({ where: { id: existing.id }, data: { organizationName, logoUrl } });
  await logAudit({ entityType: "SystemSettings", entityId: existing.id, action: "EDITED", userId: actor.id, newValue: { organizationName, logoUrl } });

  revalidatePath("/admin/settings");
}

export async function updatePhotoLimit(maxPhotoSizeMb: number) {
  const actor = await requireSettingsManager();

  if (!Number.isInteger(maxPhotoSizeMb) || maxPhotoSizeMb < 1 || maxPhotoSizeMb > 100) {
    throw new Error("Photo size limit must be a whole number between 1 and 100 MB.");
  }

  const existing = await getOrCreateSettings();
  await db.systemSettings.update({ where: { id: existing.id }, data: { maxPhotoSizeMb } });
  await logAudit({ entityType: "SystemSettings", entityId: existing.id, action: "EDITED", userId: actor.id, newValue: { maxPhotoSizeMb } });

  revalidatePath("/admin/settings");
}

export async function setNotificationEnabled(type: NotificationType, enabled: boolean) {
  const actor = await requireSettingsManager();

  await db.notificationSetting.upsert({ where: { type }, create: { type, enabled }, update: { enabled } });
  await logAudit({ entityType: "NotificationSetting", entityId: type, action: "EDITED", userId: actor.id, newValue: { enabled } });

  revalidatePath("/admin/settings");
}

export async function addNotificationRecipient(type: NotificationType, userId: string) {
  const actor = await requireSettingsManager();

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.notificationRecipient.upsert({ where: { type_userId: { type, userId } }, create: { type, userId }, update: {} });
  await logAudit({ entityType: "NotificationSetting", entityId: type, action: "EDITED", userId: actor.id, newValue: { addedRecipient: user.name } });

  revalidatePath("/admin/settings");
}

export async function removeNotificationRecipient(type: NotificationType, userId: string) {
  const actor = await requireSettingsManager();

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.notificationRecipient.deleteMany({ where: { type, userId } });
  await logAudit({ entityType: "NotificationSetting", entityId: type, action: "EDITED", userId: actor.id, newValue: { removedRecipient: user.name } });

  revalidatePath("/admin/settings");
}
