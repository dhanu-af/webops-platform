"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { UserFacingError, guard } from "@/lib/user-error";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireLiveUser } from "@/lib/session-user";
import { revalidatePath, updateTag } from "next/cache";
import { KIOSK_POLICY_TAG } from "@/lib/cache-tags";
import { newToken, sha256, SETUP_LINK_HOURS } from "@/lib/kiosk-token";
import { canUsePin, generateTemporaryPin, hashPin } from "@/lib/pin";

// Admin side of the shop-floor iPads: register or revoke a device, and manage people's PINs. Same permission as
// the rest of user administration. Every change is audited; a PIN is never written to the audit trail or the log.
async function requireManager() {
  return requireLiveUser("users.manage");
}

async function createKioskDevice__impl(name: string) {
  const actor = await requireManager();
  const cleaned = String(name ?? "").trim();
  if (cleaned.length < 2 || cleaned.length > 60) throw new UserFacingError("Give the iPad a name of 2 to 60 characters, for example \"Bottling line iPad\".");
  const code = newToken(24);
  const device = await db.kioskDevice.create({
    data: {
      name: cleaned,
      setupCodeHash: sha256(code),
      setupExpiresAt: new Date(Date.now() + SETUP_LINK_HOURS * 60 * 60_000),
      createdById: actor.id,
    },
  });
  await logAudit({ entityType: "KioskDevice", entityId: device.id, action: "CREATED", userId: actor.id, newValue: { name: cleaned }, reason: `Shop-floor iPad "${cleaned}" added (setup link valid ${SETUP_LINK_HOURS} hours)` });
  revalidatePath("/admin/kiosks");
  return { id: device.id, code };
}

// A fresh setup link for a device that is already listed (a replaced browser, a cleared cookie).
async function renewKioskSetup__impl(id: string) {
  const actor = await requireManager();
  const device = await db.kioskDevice.findUniqueOrThrow({ where: { id } });
  if (device.revokedAt) throw new UserFacingError("That iPad has been revoked. Add it again as a new device.");
  const code = newToken(24);
  await db.kioskDevice.update({
    where: { id },
    data: { setupCodeHash: sha256(code), setupExpiresAt: new Date(Date.now() + SETUP_LINK_HOURS * 60 * 60_000), tokenHash: null },
  });
  await logAudit({ entityType: "KioskDevice", entityId: id, action: "EDITED", userId: actor.id, reason: `New setup link issued for shop-floor iPad "${device.name}" (its old registration stopped working)` });
  revalidatePath("/admin/kiosks");
  return { id, code };
}

async function revokeKioskDevice__impl(id: string) {
  const actor = await requireManager();
  const device = await db.kioskDevice.findUniqueOrThrow({ where: { id } });
  if (device.revokedAt) return;
  await db.kioskDevice.update({ where: { id }, data: { revokedAt: new Date(), tokenHash: null, setupCodeHash: null, setupExpiresAt: null } });
  await logAudit({ entityType: "KioskDevice", entityId: id, action: "EDITED", userId: actor.id, fieldName: "revoked", reason: `Shop-floor iPad "${device.name}" revoked: it can no longer show shop-floor screens and its sessions have ended` });
  revalidatePath("/admin/kiosks");
}

// Whether a staff member's own phone may open a machine tag and sign in with a PIN, besides the registered iPads.
async function setKioskAllowAnyPhone__impl(allow: boolean) {
  const actor = await requireManager();
  const settings = (await db.systemSettings.findFirst()) ?? (await db.systemSettings.create({ data: {} }));
  if (settings.kioskAllowAnyPhone === !!allow) return;
  await db.$transaction(async (tx) => {
    await tx.systemSettings.update({ where: { id: settings.id }, data: { kioskAllowAnyPhone: !!allow } });
    await logAudit(
      {
        entityType: "SystemSettings",
        entityId: settings.id,
        action: "EDITED",
        userId: actor.id,
        fieldName: "kioskAllowAnyPhone",
        oldValue: { allowed: settings.kioskAllowAnyPhone },
        newValue: { allowed: !!allow },
        reason: allow ? "Staff phones may now use machine tags with a PIN" : "Staff phones switched off: only registered shop-floor iPads accept a PIN (phone sessions end now)",
      },
      tx
    );
  });
  updateTag(KIOSK_POLICY_TAG);
  revalidatePath("/admin/kiosks");
}

// Marks a document's NFC tag as written and stuck on, so documents still waiting for a tag stand out.
async function markChecklistTagWritten__impl(checklistId: string, written: boolean) {
  const actor = await requireLiveUser("checklist.manage");
  const checklist = await db.checklist.findUniqueOrThrow({ where: { id: checklistId }, select: { name: true, tagWrittenAt: true } });
  await db.checklist.update({ where: { id: checklistId }, data: { tagWrittenAt: written ? new Date() : null } });
  await logAudit({
    entityType: "Checklist",
    entityId: checklistId,
    action: "EDITED",
    userId: actor.id,
    fieldName: "nfcTag",
    oldValue: { written: !!checklist.tagWrittenAt },
    newValue: { written },
    reason: written ? `NFC tag for "${checklist.name}" marked as written` : `NFC tag for "${checklist.name}" marked as not written`,
  });
  revalidatePath("/admin/tags");
  revalidatePath(`/admin/checklists/${checklistId}`);
}

async function requirePinTarget(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!canUsePin(user.role)) throw new UserFacingError("Shop-floor PINs are for Operators and Team Leaders. Everyone else signs in with their password.");
  return user;
}

/**
 * Gives a person a temporary 4-digit PIN (shown once, to the admin, to hand over). They must choose their own
 * PIN the first time they use it. With pinOnly the person gets no usable password at all, so the PIN is the
 * only way in and nobody, the admin included, knows a password they could sign in with.
 */
async function issueUserPin__impl(userId: string, options: { pinOnly?: boolean } = {}) {
  const actor = await requireManager();
  const user = await requirePinTarget(userId);
  if (!user.active) throw new UserFacingError("That account is deactivated.");
  const pin = generateTemporaryPin();
  await db.user.update({
    where: { id: user.id },
    data: {
      pinHash: await hashPin(user.id, pin),
      pinMustChange: true,
      pinSetAt: new Date(),
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      ...(options.pinOnly ? { passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10), mustChangePassword: false, failedLogins: 0, lockedUntil: null } : {}),
    },
  });
  await logAudit({
    entityType: "User",
    entityId: user.id,
    action: "EDITED",
    userId: actor.id,
    fieldName: "pin",
    reason: `Temporary shop-floor PIN issued for ${user.name}${options.pinOnly ? " (PIN only: password sign-in switched off)" : ""}`,
  });
  revalidatePath(`/admin/users/${user.id}/edit`);
  return { pin };
}

async function clearUserPin__impl(userId: string) {
  const actor = await requireManager();
  const user = await requirePinTarget(userId);
  await db.user.update({ where: { id: user.id }, data: { pinHash: null, pinMustChange: false, pinSetAt: new Date(), pinFailedAttempts: 0, pinLockedUntil: null } });
  await logAudit({ entityType: "User", entityId: user.id, action: "EDITED", userId: actor.id, fieldName: "pin", reason: `Shop-floor PIN removed for ${user.name}` });
  revalidatePath(`/admin/users/${user.id}/edit`);
}

async function unlockUserPin__impl(userId: string) {
  const actor = await requireManager();
  const user = await requirePinTarget(userId);
  await db.user.update({ where: { id: user.id }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
  await logAudit({ entityType: "User", entityId: user.id, action: "EDITED", userId: actor.id, fieldName: "pin", reason: `Shop-floor PIN unlocked for ${user.name}` });
  revalidatePath(`/admin/users/${user.id}/edit`);
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function createKioskDevice(...args: Parameters<typeof createKioskDevice__impl>) {
  return guard(() => createKioskDevice__impl(...args));
}

export async function renewKioskSetup(...args: Parameters<typeof renewKioskSetup__impl>) {
  return guard(() => renewKioskSetup__impl(...args));
}

export async function revokeKioskDevice(...args: Parameters<typeof revokeKioskDevice__impl>) {
  return guard(() => revokeKioskDevice__impl(...args));
}

export async function markChecklistTagWritten(...args: Parameters<typeof markChecklistTagWritten__impl>) {
  return guard(() => markChecklistTagWritten__impl(...args));
}

export async function setKioskAllowAnyPhone(...args: Parameters<typeof setKioskAllowAnyPhone__impl>) {
  return guard(() => setKioskAllowAnyPhone__impl(...args));
}

export async function issueUserPin(...args: Parameters<typeof issueUserPin__impl>) {
  return guard(() => issueUserPin__impl(...args));
}

export async function clearUserPin(...args: Parameters<typeof clearUserPin__impl>) {
  return guard(() => clearUserPin__impl(...args));
}

export async function unlockUserPin(...args: Parameters<typeof unlockUserPin__impl>) {
  return guard(() => unlockUserPin__impl(...args));
}
