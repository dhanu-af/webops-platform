"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KioskIdentify } from "@/components/kiosk/kiosk-identify";
import { getOrCreateInspectionForSchedule } from "@/lib/actions-client/inspections";
import { INSPECTION_STATUS_META } from "@/lib/status";

export type KioskSchedule = {
  id: string;
  checklistName: string;
  frequency: string;
  dueTime: string | null;
  inspection: { id: string; status: string } | null;
};

const EDITABLE = ["NOT_STARTED", "IN_PROGRESS", "RETURNED"];

/**
 * The checks due here. Tapping Start (or Continue) asks for your PIN first unless you are already signed in; the check
 * then opens with you recorded against every answer.
 */
export function KioskScheduleList({ schedules, signedIn }: { schedules: KioskSchedule[]; signedIn: boolean }) {
  const router = useRouter();
  const [pendingSchedule, setPendingSchedule] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function open(scheduleId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const id = await getOrCreateInspectionForSchedule(scheduleId);
        router.push(`/inspections/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open the check.");
      }
    });
  }

  if (identifying) {
    return (
      <KioskIdentify
        onCancel={() => {
          setIdentifying(false);
          setPendingSchedule(null);
        }}
        onSignedIn={() => {
          setIdentifying(false);
          const id = pendingSchedule;
          setPendingSchedule(null);
          if (id) open(id);
          else router.refresh();
        }}
      />
    );
  }

  if (schedules.length === 0) return <p className="rounded-[var(--radius)] border border-border bg-surface px-4 py-8 text-center text-sm text-muted">No checks are due here today.</p>;

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-status-critical-soft px-4 py-3 text-sm font-medium text-status-critical">{error}</p>}
      {schedules.map((s) => {
        const meta = s.inspection ? INSPECTION_STATUS_META[s.inspection.status as keyof typeof INSPECTION_STATUS_META] : null;
        const label = !s.inspection ? "Start" : EDITABLE.includes(s.inspection.status) ? "Continue" : "View";
        return (
          <div key={s.id} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{s.checklistName}</p>
              <p className="mt-0.5 text-xs text-muted">
                {s.frequency.replace(/_/g, " ")}
                {s.dueTime ? ` · due ${s.dueTime}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {meta && <Badge tone={meta.tone}>{meta.label}</Badge>}
              <Button
                size="lg"
                variant={label === "Start" ? "primary" : "secondary"}
                disabled={busy}
                onClick={() => {
                  if (signedIn) return open(s.id);
                  setPendingSchedule(s.id);
                  setIdentifying(true);
                }}
              >
                {busy && pendingSchedule === null ? "Opening…" : label}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
