"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { WorkflowRole } from "@/app/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requirePermission(session.user.role, "checklist.manage");
  return session.user;
}

export type WorkflowInput = {
  name: string;
  description?: string;
  requiresAreaRelease: boolean;
  steps: WorkflowRole[];
};

function validateSteps(steps: WorkflowRole[]) {
  if (steps.length === 0) throw new Error("A workflow needs at least one verification step.");
}

export async function createWorkflow(input: WorkflowInput) {
  const actor = await requireAdmin();
  if (!input.name.trim()) throw new Error("Workflow name is required.");
  validateSteps(input.steps);

  const workflow = await db.verificationWorkflow.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      requiresAreaRelease: input.requiresAreaRelease,
      steps: { create: input.steps.map((role, index) => ({ role, order: index })) },
    },
  });
  await logAudit({
    entityType: "VerificationWorkflow",
    entityId: workflow.id,
    action: "CREATED",
    userId: actor.id,
    newValue: { name: workflow.name, steps: input.steps, requiresAreaRelease: input.requiresAreaRelease },
  });

  revalidatePath("/admin/workflows");
  redirect(`/admin/workflows/${workflow.id}`);
}

export async function updateWorkflow(id: string, input: WorkflowInput) {
  const actor = await requireAdmin();
  if (!input.name.trim()) throw new Error("Workflow name is required.");
  validateSteps(input.steps);

  await db.$transaction([
    db.verificationStep.deleteMany({ where: { workflowId: id } }),
    db.verificationWorkflow.update({
      where: { id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        requiresAreaRelease: input.requiresAreaRelease,
        steps: { create: input.steps.map((role, index) => ({ role, order: index })) },
      },
    }),
  ]);
  await logAudit({
    entityType: "VerificationWorkflow",
    entityId: id,
    action: "EDITED",
    userId: actor.id,
    newValue: { name: input.name.trim(), steps: input.steps, requiresAreaRelease: input.requiresAreaRelease },
  });

  revalidatePath("/admin/workflows");
  revalidatePath(`/admin/workflows/${id}`);
}
