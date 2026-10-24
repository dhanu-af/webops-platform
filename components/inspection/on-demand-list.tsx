"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startAdHocInspection } from "@/lib/actions/inspections";

type Item = { id: string; name: string; defaultAreaId: string | null; group: string };
type Area = { id: string; label: string };

const FACILITY_WIDE = "";

function Row({ item, areas }: { item: Item; areas: Area[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [areaId, setAreaId] = useState(item.defaultAreaId ?? FACILITY_WIDE);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <div className="text-sm font-medium text-foreground">{item.name}</div>
        {error && <div className="mt-1 text-xs text-status-critical">{error}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          aria-label={`Area for ${item.name}`}
          className="max-w-52 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent"
        >
          <option value={FACILITY_WIDE}>Facility-wide</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await startAdHocInspection({ checklistId: item.id, areaId: areaId || null });
              if (!result.ok) return setError(result.error);
              router.push(`/inspections/${result.inspectionId}`);
            })
          }
        >
          {pending ? "Opening…" : "Start"}
        </Button>
      </div>
    </div>
  );
}

export function OnDemandList({ checklists, areas }: { checklists: Item[]; areas: Area[] }) {
  const groups = new Map<string, Item[]>();
  for (const c of checklists) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([group, items]) => (
        <div key={group}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{group}</h3>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <Row key={item.id} item={item} areas={areas} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
