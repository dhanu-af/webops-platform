import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function WorkflowsAdminPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.manage")) notFound();

  const workflows = await db.verificationWorkflow.findMany({
    include: { steps: { orderBy: { order: "asc" } }, checklists: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Verification Workflows</h1>
          <p className="text-sm text-muted">Configurable sign-off chains, assigned per checklist — never hard-coded.</p>
        </div>
        <Button href="/admin/workflows/new">
          <Plus className="size-4" /> New Workflow
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="divide-y divide-border">
            {workflows.map((wf) => (
              <Link key={wf.id} href={`/admin/workflows/${wf.id}`} className="block py-3.5 hover:bg-surface-sunken -mx-5 px-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{wf.name}</p>
                  {wf.requiresAreaRelease && <Badge tone="pass">Gates Area Release</Badge>}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {wf.steps.map((s, idx) => (
                    <span key={s.id} className="flex items-center gap-1.5 text-xs text-muted-strong">
                      <Badge tone="neutral">{s.role.replace(/_/g, " ")}</Badge>
                      {idx < wf.steps.length - 1 && <span className="text-muted">→</span>}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">Used by {wf.checklists.length} checklist{wf.checklists.length === 1 ? "" : "s"}</p>
              </Link>
            ))}
          </div>
          {workflows.length === 0 && <p className="py-8 text-center text-sm text-muted">No workflows yet — create your first one.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
