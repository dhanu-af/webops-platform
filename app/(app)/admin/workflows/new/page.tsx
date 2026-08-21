import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { WorkflowForm } from "../workflow-form";

export default async function NewWorkflowPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.manage")) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New Verification Workflow</h1>
        <p className="text-sm text-muted">A configurable sign-off chain — assign it to any checklist.</p>
      </div>
      <WorkflowForm />
    </div>
  );
}
