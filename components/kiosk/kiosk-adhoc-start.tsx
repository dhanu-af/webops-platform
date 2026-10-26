"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { KioskIdentify } from "@/components/kiosk/kiosk-identify";
import { startAdHocInspection } from "@/lib/actions/inspections";

type Area = { id: string; label: string };

/**
 * For a document that has no schedule: choose where it is for, enter your PIN, and it opens. The same PIN step as
 * the scheduled checks, so the person is recorded on every answer.
 */
export function KioskAdHocStart({ checklistId, areas, signedIn, facilityLevel }: { checklistId: string; areas: Area[]; signedIn: boolean; facilityLevel: boolean }) {
  const router = useRouter();
  const [pendingArea, setPendingArea] = useState<string | null | undefined>(undefined);
  const [identifying, setIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function open(areaId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await startAdHocInspection({ checklistId, areaId });
      if (!result.ok) return setError(result.error);
      router.push(`/inspections/${result.inspectionId}`);
    });
  }

  if (identifying) {
    return (
      <KioskIdentify
        onCancel={() => {
          setIdentifying(false);
          setPendingArea(undefined);
        }}
        onSignedIn={() => {
          setIdentifying(false);
          const area = pendingArea;
          setPendingArea(undefined);
          if (area !== undefined) open(area);
          else router.refresh();
        }}
      />
    );
  }

  const choose = (areaId: string | null) => {
    if (signedIn) return open(areaId);
    setPendingArea(areaId);
    setIdentifying(true);
  };

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-status-critical-soft px-4 py-3 text-sm font-medium text-status-critical">{error}</p>}
      <p className="text-sm text-muted">{facilityLevel ? "This document is for the whole facility." : "Choose where this document is for."}</p>
      {facilityLevel ? (
        <Button size="lg" disabled={busy} onClick={() => choose(null)}>
          {busy ? "Opening…" : "Start"}
        </Button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {areas.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              onClick={() => choose(a.id)}
              className="flex min-h-14 items-center rounded-xl border border-border-strong bg-surface px-4 text-left text-base text-foreground active:bg-surface-sunken disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
