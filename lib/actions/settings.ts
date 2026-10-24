"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session-user";
import { logAudit } from "@/lib/audit";
import { validateRetentionYears } from "@/lib/retention";
import { revalidatePath, updateTag } from "next/cache";
import { FACILITY_TAG, SETTINGS_TAG } from "@/lib/cached-config";
import { storePhoto, isAllowedPhotoFile } from "@/lib/storage";
import type { NotificationType } from "@/app/generated/prisma/client";

async function requireSettingsManager() {
  return requireLiveUser("areas.manage");
}

async function updateFacilityTimezone__impl(facilityId: string, timezone: string) {
  const actor = await requireSettingsManager();

  if (!Intl.supportedValuesOf("timeZone").includes(timezone)) {
    throw new UserFacingError(`"${timezone}" is not a recognised IANA timezone.`);
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

  updateTag(FACILITY_TAG);

  revalidatePath("/admin/settings");
}

async function getOrCreateSettings() {
  return (await db.systemSettings.findFirst()) ?? (await db.systemSettings.create({ data: {} }));
}

async function updateBranding__impl(formData: FormData) {
  const actor = await requireSettingsManager();

  const organizationName = ((formData.get("organizationName") as string) || "").trim() || null;
  const logoFile = formData.get("logo") as File | null;

  const existing = await getOrCreateSettings();
  let logoUrl = existing.logoUrl;
  if (logoFile && logoFile.size > 0) {
    if (!isAllowedPhotoFile(logoFile)) throw new UserFacingError("Unsupported image type for logo — use JPEG, PNG, WebP, or HEIC.");
    logoUrl = (await storePhoto(logoFile)).url;
  }

  await db.systemSettings.update({ where: { id: existing.id }, data: { organizationName, logoUrl } });
  await logAudit({ entityType: "SystemSettings", entityId: existing.id, action: "EDITED", userId: actor.id, newValue: { organizationName, logoUrl } });

  revalidatePath("/admin/settings");
}

async function updatePhotoLimit__impl(maxPhotoSizeMb: number) {
  const actor = await requireSettingsManager();

  if (!Number.isInteger(maxPhotoSizeMb) || maxPhotoSizeMb < 1 || maxPhotoSizeMb > 100) {
    throw new UserFacingError("Photo size limit must be a whole number between 1 and 100 MB.");
  }

  const existing = await getOrCreateSettings();
  await db.systemSettings.update({ where: { id: existing.id }, data: { maxPhotoSizeMb } });
  await logAudit({ entityType: "SystemSettings", entityId: existing.id, action: "EDITED", userId: actor.id, newValue: { maxPhotoSizeMb } });

  revalidatePath("/admin/settings");
}

async function setNotificationEnabled__impl(type: NotificationType, enabled: boolean) {
  const actor = await requireSettingsManager();

  await db.notificationSetting.upsert({ where: { type }, create: { type, enabled }, update: { enabled } });
  await logAudit({ entityType: "NotificationSetting", entityId: type, action: "EDITED", userId: actor.id, newValue: { enabled } });

  revalidatePath("/admin/settings");
}

async function addNotificationRecipient__impl(type: NotificationType, userId: string) {
  const actor = await requireSettingsManager();

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.notificationRecipient.upsert({ where: { type_userId: { type, userId } }, create: { type, userId }, update: {} });
  await logAudit({ entityType: "NotificationSetting", entityId: type, action: "EDITED", userId: actor.id, newValue: { addedRecipient: user.name } });

  revalidatePath("/admin/settings");
}

async function removeNotificationRecipient__impl(type: NotificationType, userId: string) {
  const actor = await requireSettingsManager();

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.notificationRecipient.deleteMany({ where: { type, userId } });
  await logAudit({ entityType: "NotificationSetting", entityId: type, action: "EDITED", userId: actor.id, newValue: { removedRecipient: user.name } });

  revalidatePath("/admin/settings");
}

// Minimum record retention (URS-16). Raising it is always fine; it can never go
// below the 3-year floor, and the change is audited with the old value.
async function updateRetentionYears__impl(years: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireSettingsManager();
  const problem = validateRetentionYears(years);
  if (problem) return { ok: false, error: problem };

  const existing = await getOrCreateSettings();
  await db.systemSettings.update({ where: { id: existing.id }, data: { retentionYears: years } });
  await logAudit({
    entityType: "SystemSettings",
    entityId: existing.id,
    action: "EDITED",
    userId: actor.id,
    fieldName: "retentionYears",
    oldValue: { value: existing.retentionYears },
    newValue: { value: years },
    reason: "Record retention period changed",
  });
  updateTag(SETTINGS_TAG);
  revalidatePath("/admin/settings");
  return { ok: true };
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function addNotificationRecipient(...args: Parameters<typeof addNotificationRecipient__impl>) {
  return guard(() => addNotificationRecipient__impl(...args));
}

export async function removeNotificationRecipient(...args: Parameters<typeof removeNotificationRecipient__impl>) {
  return guard(() => removeNotificationRecipient__impl(...args));
}

export async function setNotificationEnabled(...args: Parameters<typeof setNotificationEnabled__impl>) {
  return guard(() => setNotificationEnabled__impl(...args));
}

export async function updateBranding(...args: Parameters<typeof updateBranding__impl>) {
  return guard(() => updateBranding__impl(...args));
}

export async function updateFacilityTimezone(...args: Parameters<typeof updateFacilityTimezone__impl>) {
  return guard(() => updateFacilityTimezone__impl(...args));
}

export async function updatePhotoLimit(...args: Parameters<typeof updatePhotoLimit__impl>) {
  return guard(() => updatePhotoLimit__impl(...args));
}

export async function updateRetentionYears(...args: Parameters<typeof updateRetentionYears__impl>) {
  return guard(() => updateRetentionYears__impl(...args));
}
