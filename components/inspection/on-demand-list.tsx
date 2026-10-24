"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startAdHocInspection } from "@/lib/actions/inspections";

type Item = { id: string; name: string; defaultAreaId: string | null; group: string };
type Area = { id: string; label: string };

const FACILITY_WIDE = "";
const SELECT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent";

// Two dropdowns instead of a long list: choose the checklist, confirm the area
// (pre-filled with where that checklist is normally used), then Start.
export function OnDemandList({ checklists, areas, facilityLevel = false }: { checklists: Item[]; areas: Area[]; facilityLevel?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checklistId, setChecklistId] = useState("");
  const [areaId, setAreaId] = useState(FACILITY_WIDE);
  const [error, setError] = useState<string | null>(null);

  const groups = new Map<string, Item[]>();
  for (const c of checklists) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);

  function pickChecklist(id: string) {
    setChecklistId(id);
    setError(null);
    const item = checklists.find((c) => c.id === id);
    setAreaId(item?.defaultAreaId ?? FACILITY_WIDE);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-strong">Checklist</label>
          <select value={checklistId} onChange={(e) => pickChecklist(e.target.value)} className={SELECT_CLASS}>
            <option value="">Select a checklist…</option>
            {Array.from(groups.entries()).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-strong">Area</label>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} disabled={!checklistId} className={SELECT_CLASS}>
            <option value={FACILITY_WIDE}>{facilityLevel ? "Facility-wide" : "Select an area…"}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}
      <Button
        disabled={pending || !checklistId || (!facilityLevel && !areaId)}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startAdHocInspection({ checklistId, areaId: areaId || null });
            if (!result.ok) return setError(result.error);
            router.push(`/inspections/${result.inspectionId}`);
          })
        }
      >
        {pending ? "Opening…" : "Start"}
      </Button>
    </div>
  );
}
