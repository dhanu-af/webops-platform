import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ChecklistsPage() {
  const checklists = await db.checklist.findMany({
    include: {
      versions: { where: { isCurrent: true }, include: { items: true } },
      workflow: { include: { steps: true } },
      schedules: { where: { active: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Checklists</h1>
        <p className="text-sm text-muted">Version-controlled checklist definitions and their verification workflow.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Checklists</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="divide-y divide-border">
            {checklists.map((c) => {
              const version = c.versions[0];
              const workflowLabel = c.workflow?.steps
                .sort((a, b) => a.order - b.order)
                .map((s) => s.role.replace(/_/g, " "))
                .join(" → ");
              return (
                <div key={c.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {c.category.replace(/_/g, " ")} · v{version?.versionNumber ?? "—"} · {version?.items.length ?? 0} items
                      {workflowLabel ? ` · ${workflowLabel}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={c.active ? "pass" : "neutral"}>{c.active ? "Active" : "Archived"}</Badge>
                    <Badge tone="neutral">{c.schedules.length} schedule{c.schedules.length === 1 ? "" : "s"}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
          {checklists.length === 0 && <p className="py-8 text-center text-sm text-muted">No checklists defined yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
