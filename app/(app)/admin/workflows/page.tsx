import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function WorkflowsAdminPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.manage")) notFound();

  const workflows = await db.verificationWorkflow.findMany({
    include: { steps: { orderBy: { order: "asc" } }, checklists: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Verification Workflows</h1>
        <p className="text-sm text-muted">Configurable sign-off chains, assigned per checklist — never hard-coded.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="divide-y divide-border">
            {workflows.map((wf) => (
              <div key={wf.id} className="py-3.5">
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
