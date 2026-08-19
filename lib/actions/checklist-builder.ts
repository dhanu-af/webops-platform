"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ChecklistCategory, ItemType, Frequency, Priority, UserRole } from "@/app/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requirePermission(session.user.role, "checklist.manage");
  return session.user;
}

export async function createChecklist(input: { name: string; category: ChecklistCategory; workflowId: string; description?: string }) {
  const user = await requireAdmin();
  const checklist = await db.checklist.create({
    data: { name: input.name, category: input.category, workflowId: input.workflowId, description: input.description },
  });
  await db.checklistVersion.create({
    data: { checklistId: checklist.id, versionNumber: "1.0", createdById: user.id },
  });
  revalidatePath("/admin/checklists");
  redirect(`/admin/checklists/${checklist.id}`);
}

export async function getChecklistForEdit(id: string) {
  await requireAdmin();
  return db.checklist.findUniqueOrThrow({
    where: { id },
    include: {
      versions: { orderBy: { publishedAt: "desc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
      workflow: true,
      schedules: { include: { area: true, section: true, facility: true, assignedUser: true } },
    },
  });
}

export type BuilderItem = {
  groupLabel: string;
  prompt: string;
  helpText?: string;
  type: ItemType;
  required: boolean;
  requiresPhotoOnFail: boolean;
  criticalFailure: boolean;
  minValue?: number;
  maxValue?: number;
  choices?: string[];
};

// Never mutates an existing ChecklistVersion's items — every save publishes a
// fresh version (spec §35: historical inspections keep the exact version
// they were performed against; a controlled document gets a new revision,
// it doesn't get silently edited in place).
export async function saveChecklistVersion(input: {
  checklistId: string;
  name: string;
  category: ChecklistCategory;
  workflowId: string;
  description?: string;
  items: BuilderItem[];
}) {
  const user = await requireAdmin();
  if (input.items.length === 0) throw new Error("Add at least one item before publishing.");

  const checklist = await db.checklist.findUniqueOrThrow({
    where: { id: input.checklistId },
    include: { versions: { orderBy: { publishedAt: "desc" }, take: 1 } },
  });

  const current = checklist.versions[0];
  const [major, minor] = (current?.versionNumber ?? "0.0").split(".").map(Number);
  const nextVersionNumber = `${major}.${(minor ?? 0) + 1}`;

  await db.$transaction(async (tx) => {
    await tx.checklist.update({
      where: { id: input.checklistId },
      data: { name: input.name, category: input.category, workflowId: input.workflowId, description: input.description },
    });
    if (current) {
      await tx.checklistVersion.update({ where: { id: current.id }, data: { isCurrent: false } });
    }
    const version = await tx.checklistVersion.create({
      data: { checklistId: input.checklistId, versionNumber: nextVersionNumber, createdById: user.id, isCurrent: true },
    });
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      await tx.checklistItem.create({
        data: {
          checklistVersionId: version.id,
          groupLabel: item.groupLabel || "General",
          sortOrder: i,
          prompt: item.prompt,
          helpText: item.helpText || undefined,
          type: item.type,
          required: item.required,
          requiresPhotoOnFail: item.requiresPhotoOnFail,
          criticalFailure: item.criticalFailure,
          minValue: item.type === "NUMERIC" ? item.minValue ?? 0 : undefined,
          maxValue: item.type === "NUMERIC" ? item.maxValue ?? 5 : undefined,
          choices: item.type === "MULTIPLE_CHOICE" ? item.choices ?? [] : undefined,
        },
      });
    }
  });

  revalidatePath(`/admin/checklists/${input.checklistId}`);
  revalidatePath("/checklists");
  revalidatePath("/admin/checklists");
}

export async function setChecklistActive(id: string, active: boolean) {
  await requireAdmin();
  await db.checklist.update({ where: { id }, data: { active } });
  revalidatePath("/admin/checklists");
  revalidatePath("/checklists");
}

export async function createSchedule(input: {
  checklistId: string;
  frequency: Frequency;
  facilityId: string;
  sectionId?: string;
  areaId?: string;
  equipmentId?: string;
  dueTime?: string;
  assignedRole?: UserRole;
  priority: Priority;
  photoRequired: boolean;
}) {
  await requireAdmin();
  await db.checklistSchedule.create({
    data: {
      checklistId: input.checklistId,
      frequency: input.frequency,
      startDate: new Date(),
      facilityId: input.facilityId,
      sectionId: input.sectionId || undefined,
      areaId: input.areaId || undefined,
      equipmentId: input.equipmentId || undefined,
      dueTime: input.dueTime || undefined,
      assignedRole: input.assignedRole || undefined,
      priority: input.priority,
      photoRequired: input.photoRequired,
    },
  });
  revalidatePath(`/admin/checklists/${input.checklistId}`);
  revalidatePath("/today");
}

export async function setScheduleActive(scheduleId: string, active: boolean, checklistId: string) {
  await requireAdmin();
  await db.checklistSchedule.update({ where: { id: scheduleId }, data: { active } });
  revalidatePath(`/admin/checklists/${checklistId}`);
  revalidatePath("/today");
}
