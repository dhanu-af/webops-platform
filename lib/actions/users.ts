"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { assertPasswordPolicy } from "@/lib/password-policy";
import { normalizeLoginId, validateLoginId } from "@/lib/login-id";
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
  loginId: string;
  email?: string;
  password: string;
  /** Admin-issued password the user must replace at first sign-in. */
  temporaryPassword?: boolean;
  role: UserRole;
  employeeId?: string;
  sectionId?: string;
  areaIds?: string[];
  jobTitle?: string;
}) {
  const actor = await requireUserManager();

  const loginId = normalizeLoginId(input.loginId);
  const idProblem = validateLoginId(loginId);
  if (idProblem) throw new Error(idProblem);
  if (await db.user.findUnique({ where: { loginId } })) throw new Error(`User ID "${loginId}" is already taken.`);
  const email = input.email?.trim().toLowerCase() || null;
  if (email && (await db.user.findUnique({ where: { email } }))) throw new Error(`A user with email "${email}" already exists.`);

  assertPasswordPolicy(input.password, { loginId, email, name: input.name });
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await db.user.create({
    data: {
      name: input.name,
      loginId,
      email,
      passwordHash,
      mustChangePassword: !!input.temporaryPassword,
      role: input.role,
      employeeId: input.employeeId || undefined,
      sectionId: input.sectionId || undefined,
      assignedAreas: input.areaIds?.length ? { connect: input.areaIds.map((id) => ({ id })) } : undefined,
      jobTitle: input.jobTitle || undefined,
    },
  });

  await logAudit({ entityType: "User", entityId: user.id, action: "CREATED", userId: actor.id, newValue: { name: user.name, loginId: user.loginId, email: user.email, role: user.role, temporaryPassword: !!input.temporaryPassword } });

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

  if (input.newPassword === input.currentPassword) throw new Error("Choose a password you haven't used just now.");
  assertPasswordPolicy(input.newPassword, { loginId: user.loginId, email: user.email, name: user.name });
  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
  await logAudit({
    entityType: "User",
    entityId: user.id,
    action: "EDITED",
    userId: user.id,
    reason: user.mustChangePassword ? "Temporary password replaced by user" : "Password changed",
  });
}

export async function updateUser(
  userId: string,
  input: { loginId?: string; role: UserRole; employeeId?: string; sectionId?: string; areaIds?: string[]; jobTitle?: string }
) {
  const actor = await requireUserManager();

  const before = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { assignedAreas: { select: { id: true } } } });

  // Changing your own role could lock you out of the permission that let you
  // get here (e.g. demoting yourself out of SUPER_ADMIN) — block that specific
  // change, not the whole edit (your own job title/section are harmless).
  if (userId === actor.id && input.role !== before.role) {
    throw new Error("You can't change your own role. Ask another admin to do it.");
  }
  let loginId: string | undefined;
  if (input.loginId !== undefined && normalizeLoginId(input.loginId) !== before.loginId) {
    loginId = normalizeLoginId(input.loginId);
    const idProblem = validateLoginId(loginId);
    if (idProblem) throw new Error(idProblem);
    if (await db.user.findUnique({ where: { loginId } })) throw new Error(`User ID "${loginId}" is already taken.`);
  }
  await db.user.update({
    where: { id: userId },
    data: {
      loginId,
      role: input.role,
      employeeId: input.employeeId || null,
      sectionId: input.sectionId || null,
      assignedAreas: { set: (input.areaIds ?? []).map((id) => ({ id })) },
      jobTitle: input.jobTitle || null,
    },
  });

  await logAudit({
    entityType: "User",
    entityId: userId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { loginId: before.loginId, role: before.role, employeeId: before.employeeId, sectionId: before.sectionId, areaIds: before.assignedAreas.map((a) => a.id), jobTitle: before.jobTitle },
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
export async function adminResetPassword(userId: string, newPassword: string, temporary = true) {
  const actor = await requireUserManager();

  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { loginId: true, email: true, name: true } });
  assertPasswordPolicy(newPassword, target);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: temporary } });
  await logAudit({
    entityType: "User",
    entityId: userId,
    action: "EDITED",
    userId: actor.id,
    reason: temporary ? "Password reset by admin (temporary - user must change it at next sign-in)" : "Password reset by admin",
  });

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
