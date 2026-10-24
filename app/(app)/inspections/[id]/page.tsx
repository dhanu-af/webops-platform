import { notFound } from "next/navigation";
import { isAnswered } from "@/lib/inspection-rules";
import { canWorkOnRecord, getUserScope } from "@/lib/scope";
import { formatDateTimeInTimeZone } from "@/lib/timezone";
import { auth } from "@/lib/auth";
import { getFacilityTimezone } from "@/lib/timezone";
import { getInspection } from "@/lib/actions/inspections";
import { Badge } from "@/components/ui/badge";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { ChecklistItemCard } from "@/components/inspection/checklist-item-card";
import { EquipmentTaskRow } from "@/components/inspection/equipment-task-row";
import { SubmitBar } from "@/components/inspection/submit-bar";
import { VerificationActions, ResubmitButton } from "@/components/inspection/verification-actions";
import { VerificationTimeline } from "@/components/inspection/verification-timeline";
import { can, canVerifyOwnWork } from "@/lib/permissions";
import { RecordDetailsForm } from "@/components/inspection/record-details-form";
import { recordStatus, RECORD_STATUS_TONE } from "@/lib/record-status";
import { needsProductChangeover } from "@/lib/inspection-rules";
import { buildChecklistRenderRows } from "@/lib/checklist-render";

// Headroom for submitInspection's several sequential DB round-trips against
// Neon under a cold compute — the platform default has been observed timing
// out mid-submit in production (surfaces as a generic redacted RSC error).
export const maxDuration = 30;

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const inspection = await getInspection(id).catch(() => null);
  if (!inspection) notFound();
  const timeZone = await getFacilityTimezone();

  const meta = INSPECTION_STATUS_META[inspection.status];
  const editable =
    (inspection.status === "NOT_STARTED" || inspection.status === "IN_PROGRESS" || inspection.status === "RETURNED") &&
    can(session.user.role, "inspection.submit") &&
    canWorkOnRecord(getUserScope(session.user), session.user.id, inspection);
  const status = recordStatus(inspection.status);
  const noProduction = inspection.status === "NO_PRODUCTION";

  const responseByItem = new Map(inspection.responses.map((r) => [r.checklistItemId, r]));
  const items = inspection.checklistVersion.items;

  // An equipment triplet (Clean/Sanitised/Dry) counts as one item toward the
  // "answered / total" tally shown in the SubmitBar, matching how it renders
  // as a single row — answered as soon as any one of the three is set, not
  // only once all three are.
  const isItemAnswered = (i: (typeof items)[number]) => isAnswered(i, responseByItem.get(i.id));
  const renderRows = buildChecklistRenderRows(items);
  const total = renderRows.length;
  const answered = renderRows.filter((row) => (row.kind === "equipment-triplet" ? row.items.some(isItemAnswered) : isItemAnswered(row.item))).length;

  const noConflict =
    canVerifyOwnWork(session.user.id, inspection.operatorId) && !inspection.responses.some((r) => r.respondedById === session.user.id);

  const canActSupervisor =
    inspection.status === "AWAITING_SUPERVISOR" && ["SUPERVISOR", "TEAM_LEADER", "SUPER_ADMIN"].includes(session.user.role) && noConflict;

  const canActQa = inspection.status === "AWAITING_QA" && ["QA", "SUPER_ADMIN"].includes(session.user.role) && noConflict;

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
          <div className="flex items-center gap-2">
            <Badge tone={RECORD_STATUS_TONE[status]}>{status}</Badge>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        </div>
        <p className="text-sm text-muted">
          {inspection.area?.name ?? inspection.section?.name ?? inspection.facility.name} · v{inspection.checklistVersion.versionNumber} ·{" "}
          {inspection.frequency.replace(/_/g, " ")}
          {inspection.operator ? ` · ${inspection.operator.name}` : ""}
          {inspection.equipment ? ` · ${inspection.equipment.name}` : ""}
        </p>
        <p className="flex flex-wrap gap-x-4 text-xs">
          <a href={`/api/inspections/${inspection.id}/pdf`} className="font-medium text-accent hover:underline">
            Download record (PDF with audit trail &amp; signatures)
          </a>
          <a href={`/forms/${inspection.checklistVersion.checklistId}`} className="font-medium text-accent hover:underline">
            Blank paper form
          </a>
          {inspection.appVersion && <span className="text-muted">Release {inspection.appVersion}</span>}
        </p>
        {inspection.returnedReason && inspection.status === "RETURNED" && (
          <div className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">
            Returned: {inspection.returnedReason}
          </div>
        )}
      </div>

      {noProduction && (
        <div className="rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm">
          <p className="font-medium text-foreground">No production — task closed</p>
          <p className="mt-1 text-muted">
            {inspection.noProductionReason}
            {inspection.operator ? ` · ${inspection.operator.name}` : ""} · {formatDateTimeInTimeZone(inspection.updatedAt, timeZone)}
          </p>
        </div>
      )}

      {inspection.status === "RETURNED" && can(session.user.role, "inspection.submit") && <ResubmitButton inspectionId={inspection.id} />}

      {!noProduction && (
      <RecordDetailsForm
        inspectionId={inspection.id}
        editable={editable}
        changeover={needsProductChangeover(inspection.checklistVersion.checklist.category)}
        initial={{
          product: inspection.product ?? "",
          batchNumber: inspection.batchNumber ?? "",
          previousProduct: inspection.previousProduct ?? "",
          previousBatchNumber: inspection.previousBatchNumber ?? "",
        }}
      />
      )}

      {!noProduction && (
      <div className="space-y-6">
        {Array.from(groups.entries()).map(([groupLabel, groupItems]) => (
          <div key={groupLabel} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{groupLabel}</h2>
            <div className="space-y-3">
              {buildChecklistRenderRows(groupItems).map((row) =>
                row.kind === "equipment-triplet" ? (
                  <EquipmentTaskRow
                    key={row.items[0].id}
                    inspectionId={inspection.id}
                    editable={editable}
                    canUndo={editable && !inspection.submittedAt}
                    timeZone={timeZone}
                    equipmentName={row.equipmentName}
                    helpText={row.helpText}
                    items={row.items.map((item) => {
                      const r = responseByItem.get(item.id);
                      // A stage emptied by Undo keeps its row but is not an answer, so it shows no attribution.
                      const hasValue = r?.choiceValue === "DONE" || r?.choiceValue === "NA";
                      return {
                        id: item.id,
                        stage: item.prompt.split(" — ").pop() as "Clean" | "Sanitised" | "Dry",
                        required: item.required,
                        choiceValue: r?.choiceValue ?? null,
                        respondedByName: hasValue ? (r?.respondedBy?.name ?? null) : null,
                        respondedAt: hasValue ? (r?.updatedAt ?? null) : null,
                      };
                    })}
                  />
                ) : (
                  <ChecklistItemCard
                    key={row.item.id}
                    inspectionId={inspection.id}
                    editable={editable}
                    canUndo={editable && !inspection.submittedAt}
                    timeZone={timeZone}
                    item={row.item}
                    response={responseByItem.get(row.item.id) ?? null}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {(canActSupervisor || canActQa) && <VerificationActions inspectionId={inspection.id} stage={canActSupervisor ? "SUPERVISOR" : "QA"} signerName={session.user.name ?? "You"} />}

      {inspection.verificationRecords.length > 0 || inspection.submittedAt ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <p className="mb-4 text-sm font-semibold text-foreground">Verification Timeline</p>
          <VerificationTimeline
            operatorName={inspection.operator?.name}
            submittedAt={inspection.submittedAt}
            records={inspection.verificationRecords}
            areaReleaseStatus={inspection.areaRelease?.status}
            timeZone={timeZone}
          />
        </div>
      ) : null}

      {editable && <SubmitBar inspectionId={inspection.id} answered={answered} total={total} />}
    </div>
  );
}
