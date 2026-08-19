import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInspection } from "@/lib/actions/inspections";
import { Badge } from "@/components/ui/badge";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { ChecklistItemCard } from "@/components/inspection/checklist-item-card";
import { SubmitBar } from "@/components/inspection/submit-bar";
import { VerificationActions, ResubmitButton } from "@/components/inspection/verification-actions";
import { VerificationTimeline } from "@/components/inspection/verification-timeline";
import { canVerifyOwnWork } from "@/lib/permissions";

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const inspection = await getInspection(id).catch(() => null);
  if (!inspection) notFound();

  const meta = INSPECTION_STATUS_META[inspection.status];
  const editable =
    (inspection.status === "NOT_STARTED" || inspection.status === "IN_PROGRESS" || inspection.status === "RETURNED") &&
    (!inspection.operatorId || inspection.operatorId === session.user.id);

  const responseByItem = new Map(inspection.responses.map((r) => [r.checklistItemId, r]));
  const items = inspection.checklistVersion.items;
  const answered = items.filter((i) => {
    const r = responseByItem.get(i.id);
    if (!r) return false;
    return i.type === "ACKNOWLEDGEMENT" ? r.choiceValue === "DONE" : true;
  }).length;

  const canActSupervisor =
    inspection.status === "AWAITING_SUPERVISOR" &&
    ["SUPERVISOR", "TEAM_LEADER", "SUPER_ADMIN"].includes(session.user.role) &&
    canVerifyOwnWork(session.user.id, inspection.operatorId);

  const canActQa =
    inspection.status === "AWAITING_QA" &&
    ["QA", "SUPER_ADMIN"].includes(session.user.role) &&
    canVerifyOwnWork(session.user.id, inspection.operatorId);

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    if (!groups.has(item.groupLabel)) groups.set(item.groupLabel, []);
    groups.get(item.groupLabel)!.push(item);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{inspection.checklistVersion.checklist.name}</h1>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <p className="text-sm text-muted">
          {inspection.area?.name ?? inspection.section?.name ?? inspection.facility.name} · v{inspection.checklistVersion.versionNumber} ·{" "}
          {inspection.frequency.replace(/_/g, " ")}
          {inspection.operator ? ` · ${inspection.operator.name}` : ""}
        </p>
        {inspection.returnedReason && inspection.status === "RETURNED" && (
          <div className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">
            Returned: {inspection.returnedReason}
          </div>
        )}
      </div>

      {inspection.status === "RETURNED" && (
        <ResubmitButton inspectionId={inspection.id} />
      )}

      <div className="space-y-6">
        {Array.from(groups.entries()).map(([groupLabel, groupItems]) => (
          <div key={groupLabel} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{groupLabel}</h2>
            <div className="space-y-3">
              {groupItems.map((item) => (
                <ChecklistItemCard
                  key={item.id}
                  inspectionId={inspection.id}
                  editable={editable}
                  item={item}
                  response={responseByItem.get(item.id) ?? null}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {(canActSupervisor || canActQa) && <VerificationActions inspectionId={inspection.id} stage={canActSupervisor ? "SUPERVISOR" : "QA"} />}

      {inspection.verificationRecords.length > 0 || inspection.submittedAt ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <p className="mb-4 text-sm font-semibold text-foreground">Verification Timeline</p>
          <VerificationTimeline
            operatorName={inspection.operator?.name}
            submittedAt={inspection.submittedAt}
            records={inspection.verificationRecords}
            areaReleaseStatus={inspection.areaRelease?.status}
          />
        </div>
      ) : null}

      {editable && <SubmitBar inspectionId={inspection.id} answered={answered} total={items.length} />}
    </div>
  );
}
