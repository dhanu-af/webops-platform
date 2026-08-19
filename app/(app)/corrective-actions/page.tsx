import Link from "next/link";
import { listCorrectiveActions } from "@/lib/data/inspections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CORRECTIVE_ACTION_STATUS_META, SEVERITY_META } from "@/lib/status";
import { format, isPast } from "date-fns";
import { CloseCorrectiveActionButton } from "@/components/inspection/close-corrective-action-button";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function CorrectiveActionsPage() {
  const [actions, session] = await Promise.all([listCorrectiveActions(), auth()]);
  const canClose = session?.user ? can(session.user.role, "inspection.verify.qa") || can(session.user.role, "inspection.verify.supervisor") : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Corrective Actions</h1>
        <p className="text-sm text-muted">Every finding, tracked from root cause to verified closure.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open &amp; Recent</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {actions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No corrective actions recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {actions.map((ca) => {
                const statusMeta = CORRECTIVE_ACTION_STATUS_META[isPast(ca.dueDate) && ca.status !== "CLOSED" ? "OVERDUE" : ca.status];
                const severityMeta = SEVERITY_META[ca.finding.severity];
                return (
                  <div key={ca.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={severityMeta.tone}>{severityMeta.label}</Badge>
                        <Link href={`/inspections/${ca.finding.inspectionId}`} className="truncate text-sm font-medium text-foreground hover:text-accent">
                          {ca.finding.description}
                        </Link>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {ca.area?.name ?? "—"} · {ca.correctiveAction} · owner {ca.responsibleUser.name} · due {format(ca.dueDate, "d MMM yyyy")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      {canClose && ca.status !== "CLOSED" && <CloseCorrectiveActionButton id={ca.id} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
