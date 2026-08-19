import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { StartScheduleButton } from "@/components/inspection/start-schedule-button";

type Schedule = {
  id: string;
  frequency: string;
  dueTime: string | null;
  checklist: { name: string };
  facility: { name: string };
  section: { name: string } | null;
  area: { name: string } | null;
  inspections: Array<{ status: string }>;
};

export function ScheduleList({ schedules, emptyLabel }: { schedules: Schedule[]; emptyLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Checks</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {schedules.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{emptyLabel}</p>
        ) : (
          <div className="divide-y divide-border">
            {schedules.map((s) => {
              const inspection = s.inspections[0];
              const meta = inspection ? INSPECTION_STATUS_META[inspection.status] : null;
              const label = !inspection ? "Start" : ["NOT_STARTED", "IN_PROGRESS", "RETURNED"].includes(inspection.status) ? "Continue" : "View";
              return (
                <div key={s.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{s.checklist.name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {s.frequency.replace(/_/g, " ")} · {s.area?.name ?? s.section?.name ?? s.facility.name}
                      {s.dueTime ? ` · due ${s.dueTime}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {meta && <Badge tone={meta.tone}>{meta.label}</Badge>}
                    <StartScheduleButton scheduleId={s.id} label={label} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
