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

export async function getRecentLogins(take = 20) {
  await requireUserManager();
  return db.auditLog.findMany({
    where: { action: "LOGIN" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}
