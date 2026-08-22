"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@/app/generated/prisma/client";

async function requireUserManager() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requirePermission(session.user.role, "users.manage");
  return session.user;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string;
  sectionId?: string;
  areaId?: string;
  jobTitle?: string;
}) {
  const actor = await requireUserManager();

  const existing = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new Error(`A user with email "${input.email}" already exists.`);

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      employeeId: input.employeeId || undefined,
      sectionId: input.sectionId || undefined,
      areaId: input.areaId || undefined,
      jobTitle: input.jobTitle || undefined,
    },
  });

  await logAudit({ entityType: "User", entityId: user.id, action: "CREATED", userId: actor.id, newValue: { name: user.name, email: user.email, role: user.role } });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function getSectionsForUserForm() {
  await requireUserManager();
  return db.section.findMany({ include: { facility: true }, orderBy: [{ facility: { name: "asc" } }, { sortOrder: "asc" }] });
}

export async function getAreasForUserForm() {
  await requireUserManager();
  return db.area.findMany({
    where: { archived: false },
    include: { section: { include: { facility: true } } },
    orderBy: [{ section: { facility: { name: "asc" } } }, { section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  await logAudit({ entityType: "User", entityId: user.id, action: "EDITED", userId: user.id, reason: "Password changed" });
}

export async function updateUser(
  userId: string,
  input: { role: UserRole; employeeId?: string; sectionId?: string; areaId?: string; jobTitle?: string }
) {
  const actor = await requireUserManager();

  const before = await db.user.findUniqueOrThrow({ where: { id: userId } });

  // Changing your own role could lock you out of the permission that let you
  // get here (e.g. demoting yourself out of SUPER_ADMIN) — block that specific
  // change, not the whole edit (your own job title/section are harmless).
  if (userId === actor.id && input.role !== before.role) {
    throw new Error("You can't change your own role. Ask another admin to do it.");
  }
  await db.user.update({
    where: { id: userId },
    data: {
      role: input.role,
      employeeId: input.employeeId || null,
      sectionId: input.sectionId || null,
      areaId: input.areaId || null,
      jobTitle: input.jobTitle || null,
    },
  });

  await logAudit({
    entityType: "User",
    entityId: userId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { role: before.role, employeeId: before.employeeId, sectionId: before.sectionId, areaId: before.areaId, jobTitle: before.jobTitle },
    newValue: input,
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setUserActive(userId: string, active: boolean) {
  const actor = await requireUserManager();

  if (userId === actor.id) throw new Error("You can't deactivate your own account.");

  const user = await db.user.update({ where: { id: userId }, data: { active } });
  await logAudit({
    entityType: "User",
    entityId: userId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { active: !active },
    newValue: { active },
    reason: active ? "Reactivated" : "Deactivated",
  });

  revalidatePath("/admin/users");
  return user.active;
}

// For a user who's forgotten their password entirely (self-service change
// requires knowing the *current* password, so it can't help here) — an admin
// sets a new one directly, no email/reset-token infra needed.
export async function adminResetPassword(userId: string, newPassword: string) {
  const actor = await requireUserManager();

  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  await logAudit({ entityType: "User", entityId: userId, action: "EDITED", userId: actor.id, reason: "Password reset by admin" });

  revalidatePath("/admin/users");
}

export async function getRecentLogins(take = 20) {
  await requireUserManager();
  return db.auditLog.findMany({
    where: { action: "LOGIN" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}
