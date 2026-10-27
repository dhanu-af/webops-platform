"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password-policy";
import { normalizeLoginId, validateLoginId } from "@/lib/login-id";
import { requireUserWithPermission } from "@/lib/session-user";
import { runAction, UserFacingError, type ActionResult } from "@/lib/user-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@/app/generated/prisma/client";
import { SAFE_USER } from "@/lib/safe-user";
import { visibleUsersWhere } from "@/lib/visible-users";

// Every action here that a person can get "wrong" (taken User ID, weak
// password, wrong current password) returns an ActionResult instead of
// throwing: in production Next.js hides the text of a thrown server-action
// error, so the form would only ever show a generic "An error occurred".

const requireUserManager = () => requireUserWithPermission("users.manage");

// Only a Super Admin may create, promote, edit or reset another Super Admin; otherwise an Admin could
// give themselves (or a friend) the most privileged role, or take over that account.
function assertMayManageRole(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    throw new UserFacingError("Only a Super Admin can create or change a Super Admin account.");
  }
}

function checkPassword(password: string) {
  const problems = validatePassword(password);
  if (problems.length) throw new UserFacingError(`Password not accepted. ${problems.join(" ")}`);
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
}): Promise<ActionResult> {
  const result = await runAction(async () => {
    const actor = await requireUserManager();
    assertMayManageRole(actor.role, input.role);

    const loginId = normalizeLoginId(input.loginId);
    const idProblem = validateLoginId(loginId);
    if (idProblem) throw new UserFacingError(idProblem);
    if (await db.user.findUnique({ where: { loginId } })) throw new UserFacingError(`User ID "${loginId}" is already taken.`);
    const email = input.email?.trim().toLowerCase() || null;
    if (email && (await db.user.findUnique({ where: { email } }))) throw new UserFacingError(`A user with email "${email}" already exists.`);
    if (input.employeeId && (await db.user.findUnique({ where: { employeeId: input.employeeId } }))) {
      throw new UserFacingError(`Employee number "${input.employeeId}" is already used by another user.`);
    }

    checkPassword(input.password);
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await db.user.create({
      data: {
        name: input.name,
        loginId,
        email,
        passwordHash,
        mustChangePassword: true, // an admin-chosen password is always temporary: the admin knows it, so it must never be the user's e-signature credential
        role: input.role,
        employeeId: input.employeeId || undefined,
        sectionId: input.sectionId || undefined,
        assignedAreas: input.areaIds?.length ? { connect: input.areaIds.map((id) => ({ id })) } : undefined,
        jobTitle: input.jobTitle || undefined,
      },
    });

    await logAudit({
      entityType: "User",
      entityId: user.id,
      action: "CREATED",
      userId: actor.id,
      newValue: { name: user.name, loginId: user.loginId, email: user.email, role: user.role, temporaryPassword: !!input.temporaryPassword },
    });
  });
  if (!result.ok) return result;

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

// Deliberately not behind requireActiveUser: a user on a temporary password has
// to be able to run exactly this action, and nothing else, to get unstuck.
export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) throw new UserFacingError("Not authenticated");

    const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
    if (!user.active) throw new UserFacingError("This account is deactivated. Contact an administrator.");
    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new UserFacingError("Current password is incorrect.");

    if (input.newPassword === input.currentPassword) throw new UserFacingError("Choose a password you haven't used just now.");
    checkPassword(input.newPassword);
    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await db.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false, failedLogins: 0, lockedUntil: null } });
    await logAudit({
      entityType: "User",
      entityId: user.id,
      action: "EDITED",
      userId: user.id,
      reason: user.mustChangePassword ? "Temporary password replaced by user" : "Password changed",
    });
  });
}

export async function updateUser(
  userId: string,
  input: { loginId?: string; role: UserRole; employeeId?: string; sectionId?: string; areaIds?: string[]; jobTitle?: string }
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const actor = await requireUserManager();

    const before = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { assignedAreas: { select: { id: true } } } });
    assertMayManageRole(actor.role, before.role);
    assertMayManageRole(actor.role, input.role);

    // Changing your own role could lock you out of the permission that let you
    // get here (e.g. demoting yourself out of SUPER_ADMIN) — block that specific
    // change, not the whole edit (your own job title/section are harmless).
    if (userId === actor.id && input.role !== before.role) {
      throw new UserFacingError("You can't change your own role. Ask another admin to do it.");
    }
    let loginId: string | undefined;
    if (input.loginId !== undefined && normalizeLoginId(input.loginId) !== before.loginId) {
      loginId = normalizeLoginId(input.loginId);
      const idProblem = validateLoginId(loginId);
      if (idProblem) throw new UserFacingError(idProblem);
      if (await db.user.findUnique({ where: { loginId } })) throw new UserFacingError(`User ID "${loginId}" is already taken.`);
    }
    if (input.employeeId && input.employeeId !== before.employeeId) {
      const clash = await db.user.findUnique({ where: { employeeId: input.employeeId } });
      if (clash) throw new UserFacingError(`Employee number "${input.employeeId}" is already used by another user.`);
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
      oldValue: {
        loginId: before.loginId,
        role: before.role,
        employeeId: before.employeeId,
        sectionId: before.sectionId,
        areaIds: before.assignedAreas.map((a) => a.id),
        jobTitle: before.jobTitle,
      },
      newValue: input,
    });
  });
  if (!result.ok) return result;

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// Permanently deletes an account that was never used. Super Admin only. An account with any history (a sign-in, an answer,
// a signature, an audit entry...) cannot be deleted, because records and the audit trail must keep naming who did what:
// deactivate it instead. The database itself refuses the delete in that case, which is what is relied on here.
export async function deleteUser(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireUserManager();
    if (actor.role !== "SUPER_ADMIN") throw new UserFacingError("Only a Super Admin can delete an account.");
    if (userId === actor.id) throw new UserFacingError("You can't delete your own account.");

    const target = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, loginId: true, role: true, active: true } });
    if (target.role === "SUPER_ADMIN") {
      const others = await db.user.count({ where: { role: "SUPER_ADMIN", active: true, id: { not: userId } } });
      if (others === 0) throw new UserFacingError("This is the only active Super Admin, so it cannot be deleted.");
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.user.delete({ where: { id: userId } });
        await logAudit(
          {
            entityType: "User",
            entityId: userId,
            action: "DELETED",
            userId: actor.id,
            oldValue: { name: target.name, loginId: target.loginId, role: target.role },
            reason: `Account ${target.name} (${target.loginId}) deleted: it had no activity`,
          },
          tx
        );
      });
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code === "P2003" || code === "P2014" || /foreign key|restrict|cannot be deleted|read-only/i.test(String((e as Error)?.message ?? ""))) {
        throw new UserFacingError(`${target.name} has history (sign-ins, records or audit entries), so the account is kept to keep the records attributable. Deactivate it instead.`);
      }
      throw e;
    }
    revalidatePath("/admin/users");
  });
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireUserManager();

    if (userId === actor.id) throw new UserFacingError("You can't deactivate your own account.");
    // An Admin cannot switch a Super Admin on or off (and cannot tell the account exists).
    const target = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
    assertMayManageRole(actor.role, target.role);

    await db.user.update({ where: { id: userId }, data: { active } });
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
  });
}

// For a user who's forgotten their password entirely (self-service change
// requires knowing the *current* password, so it can't help here) — an admin
// sets a new one directly, no email/reset-token infra needed.
export async function adminResetPassword(userId: string, newPassword: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireUserManager();

    const target = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, role: true } });
    assertMayManageRole(actor.role, target.role);
    checkPassword(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    // a reset also unlocks an account locked by repeated wrong passwords
    await db.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true, failedLogins: 0, lockedUntil: null } });
    await logAudit({
      entityType: "User",
      entityId: userId,
      action: "EDITED",
      userId: actor.id,
      reason: "Password reset by admin (temporary - user must change it at next sign-in)",
    });

    revalidatePath("/admin/users");
  });
}

export async function getRecentLogins(take = 20) {
  const actor = await requireUserManager();
  return db.auditLog.findMany({
    where: { action: "LOGIN", user: visibleUsersWhere(actor.role) },
    include: { user: { select: SAFE_USER } },
    orderBy: { createdAt: "desc" },
    take,
  });
}
