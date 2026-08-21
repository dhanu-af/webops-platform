import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getChecklistForEdit } from "@/lib/actions/checklist-builder";
import { ChecklistEditor } from "./checklist-editor";
import { ScheduleManager } from "./schedule-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFacilityTimezone, formatDateTimeInTimeZone } from "@/lib/timezone";

export default async function ChecklistEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "checklist.manage")) notFound();

  const { id } = await params;
  const checklist = await getChecklistForEdit(id).catch(() => null);
  if (!checklist) notFound();
  const timeZone = await getFacilityTimezone();

  const [workflows, facilities] = await Promise.all([
    db.verificationWorkflow.findMany({ include: { steps: { orderBy: { order: "asc" } } }, orderBy: { name: "asc" } }),
    db.facility.findMany({
      where: { archived: false },
      include: { sections: { where: { archived: false }, include: { areas: { where: { archived: false }, include: { equipment: { where: { archived: false } } } } } } },
    }),
  ]);

  const currentVersion = checklist.versions.find((v) => v.isCurrent) ?? checklist.versions[0];
  const olderVersions = checklist.versions.filter((v) => v.id !== currentVersion?.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{checklist.name}</h1>
        <p className="text-sm text-muted">Editing creates a new version — historical inspections keep the version they were performed against.</p>
      </div>

      <ChecklistEditor
        checklistId={checklist.id}
        initialName={checklist.name}
        initialCategory={checklist.category}
        initialDescription={checklist.description ?? ""}
        initialWorkflowId={checklist.workflowId ?? ""}
        currentVersionNumber={currentVersion?.versionNumber ?? "1.0"}
        initialItems={(currentVersion?.items ?? []).map((i) => ({
          groupLabel: i.groupLabel,
          prompt: i.prompt,
          helpText: i.helpText ?? "",
          type: i.type,
          required: i.required,
          requiresPhotoOnFail: i.requiresPhotoOnFail,
          criticalFailure: i.criticalFailure,
          minValue: i.minValue ?? undefined,
          maxValue: i.maxValue ?? undefined,
          choices: Array.isArray(i.choices) ? (i.choices as string[]) : undefined,
        }))}
        workflows={workflows.map((w) => ({ id: w.id, name: w.name, steps: w.steps.map((s) => s.role) }))}
        active={checklist.active}
      />

      <ScheduleManager checklistId={checklist.id} facilities={facilities} schedules={checklist.schedules} />

      {olderVersions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Version History</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="divide-y divide-border">
              {[currentVersion, ...olderVersions].map(
                (v) =>
                  v && (
                    <div key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-mono-tabular text-foreground">v{v.versionNumber}{v.isCurrent ? " (current)" : ""}</span>
                      <span className="text-xs text-muted">{v.items.length} items · published {formatDateTimeInTimeZone(v.publishedAt, timeZone)}</span>
                    </div>
                  )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
