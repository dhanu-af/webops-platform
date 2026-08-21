"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSchedule, setScheduleActive } from "@/lib/actions/checklist-builder";
import type { Frequency, Priority, UserRole } from "@/app/generated/prisma/client";
import { Plus } from "lucide-react";

const FREQUENCIES: Frequency[] = [
  "PER_SHIFT",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "AD_HOC",
  "BEFORE_PRODUCTION",
  "AFTER_PRODUCTION",
  "AFTER_CLEANING",
  "AFTER_MAINTENANCE",
];
const ROLES: UserRole[] = ["OPERATOR", "TEAM_LEADER", "SUPERVISOR", "QA"];

type Facility = {
  id: string;
  name: string;
  sections: Array<{ id: string; name: string; areas: Array<{ id: string; name: string; equipment: Array<{ id: string; name: string }> }> }>;
};

type Schedule = {
  id: string;
  frequency: Frequency;
  dueTime: string | null;
  active: boolean;
  assignedRole: UserRole | null;
  facility: { name: string };
  section: { name: string } | null;
  area: { name: string } | null;
};

export function ScheduleManager({ checklistId, facilities, schedules }: { checklistId: string; facilities: Facility[]; schedules: Schedule[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("DAILY");
  const [scopeKey, setScopeKey] = useState<string>("");
  const [dueTime, setDueTime] = useState("");
  const [assignedRole, setAssignedRole] = useState<UserRole>("OPERATOR");
  const [photoRequired, setPhotoRequired] = useState(true);

  // Scopes range from a whole facility (e.g. the existing Weekly 5S Audit)
  // down to a single area — createSchedule already supports any of these
  // via optional sectionId/areaId, this just exposes the broader levels
  // the picker used to force everything down to "area" and skip.
  const scopes = facilities.flatMap((f) => [
    { key: `f:${f.id}`, facilityId: f.id, sectionId: undefined as string | undefined, areaId: undefined as string | undefined, label: `${f.name} (whole facility)` },
    ...f.sections.flatMap((s) => [
      { key: `s:${s.id}`, facilityId: f.id, sectionId: s.id, areaId: undefined as string | undefined, label: `${f.name} / ${s.name} (whole section)` },
      ...s.areas.map((a) => ({ key: `a:${a.id}`, facilityId: f.id, sectionId: s.id, areaId: a.id, label: `${f.name} / ${s.name} / ${a.name}` })),
    ]),
  ]);

  function handleAdd() {
    setError(null);
    const scope = scopes.find((s) => s.key === scopeKey);
    if (!scope) return setError("Select a facility, section, or area.");
    startTransition(async () => {
      try {
        await createSchedule({
          checklistId,
          frequency,
          facilityId: scope.facilityId,
          sectionId: scope.sectionId,
          areaId: scope.areaId,
          dueTime: dueTime || undefined,
          assignedRole,
          priority: "NORMAL" as Priority,
          photoRequired,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create schedule.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedules ({schedules.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="divide-y divide-border">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="text-sm text-foreground">
                {s.frequency.replace(/_/g, " ")} · {s.area?.name ?? s.section?.name ?? s.facility.name}
                {s.dueTime ? ` · due ${s.dueTime}` : ""}
                {s.assignedRole ? ` · ${s.assignedRole.replace(/_/g, " ")}` : ""}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={s.active ? "pass" : "neutral"}>{s.active ? "Active" : "Paused"}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    startTransition(async () => {
                      await setScheduleActive(s.id, !s.active, checklistId);
                      router.refresh();
                    })
                  }
                >
                  {s.active ? "Pause" : "Resume"}
                </Button>
              </div>
            </div>
          ))}
          {schedules.length === 0 && <p className="py-4 text-center text-sm text-muted">No schedules yet — this checklist won&apos;t appear in Today&apos;s Ops until one is added.</p>}
        </div>

        <div className="grid gap-2 rounded-lg border border-dashed border-border-strong p-3 sm:grid-cols-2">
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent">
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select value={scopeKey} onChange={(e) => setScopeKey(e.target.value)} className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent">
            <option value="">Select facility, section, or area…</option>
            {scopes.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            placeholder="Due time e.g. 17:00 (optional)"
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <select value={assignedRole} onChange={(e) => setAssignedRole(e.target.value as UserRole)} className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-strong sm:col-span-2">
            <input type="checkbox" checked={photoRequired} onChange={(e) => setPhotoRequired(e.target.checked)} />
            Photo evidence required
          </label>
          {error && <p className="text-xs text-status-critical sm:col-span-2">{error}</p>}
          <Button size="sm" variant="secondary" disabled={pending} onClick={handleAdd} className="sm:col-span-2">
            <Plus className="size-3.5" /> {pending ? "Adding…" : "Add Schedule"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
