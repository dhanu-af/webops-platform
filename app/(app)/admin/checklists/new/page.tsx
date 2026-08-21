import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { NewChecklistForm } from "./new-checklist-form";

export default async function NewChecklistPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.manage")) notFound();

  const workflows = await db.verificationWorkflow.findMany({
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New Checklist</h1>
        <p className="text-sm text-muted">Set the basics — you&apos;ll add items on the next screen.</p>
      </div>
      <NewChecklistForm workflows={workflows.map((w) => ({ id: w.id, name: w.name, steps: w.steps.map((s) => s.role) }))} />
    </div>
  );
}
