"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session-user";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { WorkflowRole } from "@/app/generated/prisma/client";

async function requireAdmin() {
  return requireLiveUser("checklist.manage");
}

export type WorkflowInput = {
  name: string;
  description?: string;
  requiresAreaRelease: boolean;
  steps: WorkflowRole[];
};

function validateSteps(steps: WorkflowRole[]) {
  if (steps.length === 0) throw new UserFacingError("A workflow needs at least one verification step.");
}

async function createWorkflow__impl(input: WorkflowInput) {
  const actor = await requireAdmin();
  if (!input.name.trim()) throw new UserFacingError("Workflow name is required.");
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

async function updateWorkflow__impl(id: string, input: WorkflowInput) {
  const actor = await requireAdmin();
  if (!input.name.trim()) throw new UserFacingError("Workflow name is required.");
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

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function createWorkflow(...args: Parameters<typeof createWorkflow__impl>) {
  return guard(() => createWorkflow__impl(...args));
}

export async function updateWorkflow(...args: Parameters<typeof updateWorkflow__impl>) {
  return guard(() => updateWorkflow__impl(...args));
}
