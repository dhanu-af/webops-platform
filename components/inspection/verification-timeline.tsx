import { Check, X, Undo2, ShieldCheck } from "lucide-react";
import { formatDateTimeInTimeZone } from "@/lib/timezone";

type Record = {
  id: string;
  stepRole: string;
  action: string;
  comment: string | null;
  createdAt: Date;
  actor: { name: string };
};

export function VerificationTimeline({
  operatorName,
  submittedAt,
  records,
  areaReleaseStatus,
  timeZone,
}: {
  operatorName?: string | null;
  submittedAt?: Date | null;
  records: Record[];
  areaReleaseStatus?: string | null;
  timeZone: string;
}) {
  const steps = [
    operatorName && submittedAt
      ? { role: "Operator", name: operatorName, action: "Submitted", at: submittedAt, tone: "pass" as const }
      : null,
    ...records.map((r) => ({
      role: r.stepRole === "TEAM_LEADER" ? "Team Leader" : r.stepRole === "SUPERVISOR" ? "Supervisor" : "QA",
      name: r.actor.name,
      action: r.action === "APPROVE" ? "Approved" : r.action === "RETURN" ? "Returned" : "Rejected",
      at: r.createdAt,
      comment: r.comment,
      tone: r.action === "APPROVE" ? ("pass" as const) : ("critical" as const),
    })),
  ].filter(Boolean) as Array<{ role: string; name: string; action: string; at: Date; comment?: string | null; tone: "pass" | "critical" }>;

  if (steps.length === 0) return null;

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${step.tone === "pass" ? "bg-status-pass-soft text-status-pass" : "bg-status-critical-soft text-status-critical"}`}>
              {step.action === "Approved" || step.action === "Submitted" ? <Check className="size-3.5" /> : step.action === "Returned" ? <Undo2 className="size-3.5" /> : <X className="size-3.5" />}
            </div>
            {idx < steps.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-5">
            <p className="text-sm font-medium text-foreground">
              {step.role} <span className="font-normal text-muted">· {step.name}</span>
            </p>
            <p className="text-xs text-muted">
              {step.action} — {formatDateTimeInTimeZone(step.at, timeZone)}
            </p>
            {step.comment && <p className="mt-1 text-xs text-status-critical">&ldquo;{step.comment}&rdquo;</p>}
          </div>
        </div>
      ))}
      {areaReleaseStatus === "QA_RELEASED" && (
        <div className="flex items-center gap-2 rounded-lg bg-status-pass-soft px-3 py-2 text-sm font-semibold text-status-pass">
          <ShieldCheck className="size-4" /> AREA RELEASED
        </div>
      )}
    </div>
  );
}
