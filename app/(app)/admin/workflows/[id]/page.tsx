import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { WorkflowForm } from "../workflow-form";

export default async function EditWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.manage")) notFound();

  const { id } = await params;
  const workflow = await db.verificationWorkflow.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } }, checklists: true },
  });
  if (!workflow) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{workflow.name}</h1>
        <p className="text-sm text-muted">
          Used by {workflow.checklists.length} checklist{workflow.checklists.length === 1 ? "" : "s"} — editing changes the sign-off chain for
          all of them immediately.
        </p>
      </div>
      <WorkflowForm
        workflowId={workflow.id}
        initialName={workflow.name}
        initialDescription={workflow.description ?? ""}
        initialRequiresAreaRelease={workflow.requiresAreaRelease}
        initialSteps={workflow.steps.map((s) => s.role)}
      />
    </div>
  );
}
