import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloneChecklistButton } from "@/components/admin/clone-checklist-button";
import { DeleteChecklistButton } from "@/components/admin/delete-checklist-button";
import { Plus } from "lucide-react";

export default async function ChecklistBuilderListPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.manage")) notFound();

  const checklists = await db.checklist.findMany({
    include: {
      versions: { where: { isCurrent: true }, include: { items: true } },
      workflow: { include: { steps: true } },
      schedules: { where: { active: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Checklist Builder</h1>
          <p className="text-sm text-muted">Create, version and schedule checklist definitions.</p>
        </div>
        <Button href="/admin/checklists/new">
          <Plus className="size-4" /> New Checklist
        </Button>
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
                <Link
                  key={c.id}
                  href={`/admin/checklists/${c.id}`}
                  className="flex items-center justify-between gap-4 py-3.5 hover:bg-surface-sunken -mx-5 px-5"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {c.category.replace(/_/g, " ")} · v{version?.versionNumber ?? "—"} · {version?.items.length ?? 0} items
                      {workflowLabel ? ` · ${workflowLabel}` : " · no workflow"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={c.active ? "pass" : "neutral"}>{c.active ? "Active" : "Archived"}</Badge>
                    <Badge tone="neutral">{c.schedules.length} schedule{c.schedules.length === 1 ? "" : "s"}</Badge>
                    <CloneChecklistButton checklistId={c.id} />
                    <DeleteChecklistButton checklistId={c.id} checklistName={c.name} />
                  </div>
                </Link>
              );
            })}
          </div>
          {checklists.length === 0 && <p className="py-8 text-center text-sm text-muted">No checklists yet — create your first one.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
