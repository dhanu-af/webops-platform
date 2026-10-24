"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ChecklistCategory, ItemType, Frequency, Priority, UserRole } from "@/app/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new UserFacingError("Not authenticated");
  requirePermission(session.user.role, "checklist.manage");
  return session.user;
}

async function createChecklist__impl(input: { name: string; category: ChecklistCategory; workflowId: string; description?: string }) {
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
async function saveChecklistVersion__impl(input: {
  checklistId: string;
  name: string;
  category: ChecklistCategory;
  workflowId: string;
  description?: string;
  items: BuilderItem[];
}) {
  const user = await requireAdmin();
  if (input.items.length === 0) throw new UserFacingError("Add at least one item before publishing.");

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
      data: {
        checklistId: input.checklistId,
        versionNumber: nextVersionNumber,
        createdById: user.id,
        isCurrent: true,
        docControl: current?.docControl ?? undefined,
      },
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

// Duplicates a checklist's current version verbatim into a brand new
// checklist (its own id, its own version history starting at 1.0) — the
// common case is wanting the same 27-item form for a different area
// without re-typing every item, then just renaming the copy and giving it
// its own schedule. Deliberately doesn't copy schedules: a clone almost
// always needs a different area/section, not the same one as the source.
async function cloneChecklist__impl(id: string) {
  const user = await requireAdmin();

  const source = await db.checklist.findUniqueOrThrow({
    where: { id },
    include: { versions: { where: { isCurrent: true }, take: 1, include: { items: { orderBy: { sortOrder: "asc" } } } } },
  });
  const currentVersion = source.versions[0];
  if (!currentVersion) throw new UserFacingError("This checklist has no published version to clone.");

  const clone = await db.$transaction(async (tx) => {
    const newChecklist = await tx.checklist.create({
      data: {
        name: `${source.name} (Copy)`,
        category: source.category,
        workflowId: source.workflowId,
        description: source.description,
      },
    });
    const newVersion = await tx.checklistVersion.create({
      data: { checklistId: newChecklist.id, versionNumber: "1.0", createdById: user.id, docControl: currentVersion.docControl ?? undefined },
    });
    for (const item of currentVersion.items) {
      await tx.checklistItem.create({
        data: {
          checklistVersionId: newVersion.id,
          groupLabel: item.groupLabel,
          sortOrder: item.sortOrder,
          prompt: item.prompt,
          helpText: item.helpText,
          type: item.type,
          required: item.required,
          requiresPhotoOnFail: item.requiresPhotoOnFail,
          criticalFailure: item.criticalFailure,
          minValue: item.minValue,
          maxValue: item.maxValue,
          choices: item.choices ?? undefined,
        },
      });
    }
    return newChecklist;
  });

  revalidatePath("/admin/checklists");
  redirect(`/admin/checklists/${clone.id}`);
}

async function setChecklistActive__impl(id: string, active: boolean) {
  await requireAdmin();
  await db.checklist.update({ where: { id }, data: { active } });
  revalidatePath("/admin/checklists");
  revalidatePath("/checklists");
}

// Real, permanent deletion — distinct from Archive (setChecklistActive above),
// which just hides a checklist while preserving it and its history. Only
// allowed when no Inspection has ever been performed against any version of
// this checklist: once real inspection data exists, that's audit history and
// must go through Archive instead, never deletion.
async function deleteChecklist__impl(id: string) {
  await requireAdmin();

  const inspectionCount = await db.inspection.count({
    where: { checklistVersion: { checklistId: id } },
  });
  if (inspectionCount > 0) {
    throw new UserFacingError(
      `Can't delete — ${inspectionCount} inspection${inspectionCount === 1 ? "" : "s"} exist for this checklist. Archive it instead to preserve that history.`
    );
  }

  await db.checklist.delete({ where: { id } });
  revalidatePath("/admin/checklists");
  revalidatePath("/checklists");
}

async function createSchedule__impl(input: {
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

async function setScheduleActive__impl(scheduleId: string, active: boolean, checklistId: string) {
  await requireAdmin();
  await db.checklistSchedule.update({ where: { id: scheduleId }, data: { active } });
  revalidatePath(`/admin/checklists/${checklistId}`);
  revalidatePath("/today");
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function cloneChecklist(...args: Parameters<typeof cloneChecklist__impl>) {
  return guard(() => cloneChecklist__impl(...args));
}

export async function createChecklist(...args: Parameters<typeof createChecklist__impl>) {
  return guard(() => createChecklist__impl(...args));
}

export async function createSchedule(...args: Parameters<typeof createSchedule__impl>) {
  return guard(() => createSchedule__impl(...args));
}

export async function deleteChecklist(...args: Parameters<typeof deleteChecklist__impl>) {
  return guard(() => deleteChecklist__impl(...args));
}

export async function saveChecklistVersion(...args: Parameters<typeof saveChecklistVersion__impl>) {
  return guard(() => saveChecklistVersion__impl(...args));
}

export async function setChecklistActive(...args: Parameters<typeof setChecklistActive__impl>) {
  return guard(() => setChecklistActive__impl(...args));
}

export async function setScheduleActive(...args: Parameters<typeof setScheduleActive__impl>) {
  return guard(() => setScheduleActive__impl(...args));
}
