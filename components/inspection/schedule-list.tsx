import Link from "next/link";
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
  section: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  inspections: Array<{ status: string }>;
};

// Lets QA (or anyone) click straight from "what's scheduled" to "every task
// recorded for this place" -- an area link is the most specific/useful (an
// area-scoped schedule), falling back to the section for a section-wide
// schedule, and to the unfiltered list for a genuinely facility-wide one
// (there's no narrower place to point it).
function scopeHref(s: Pick<Schedule, "area" | "section">) {
  if (s.area) return `/inspections?areaId=${s.area.id}`;
  if (s.section) return `/inspections?sectionId=${s.section.id}`;
  return "/inspections";
}

export function ScheduleList({
  schedules,
  emptyLabel,
}: {
  schedules: Schedule[];
  emptyLabel: string;
}) {
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
              const meta = inspection
                ? INSPECTION_STATUS_META[inspection.status]
                : null;
              const label = !inspection
                ? "Start"
                : ["NOT_STARTED", "IN_PROGRESS", "RETURNED"].includes(
                      inspection.status,
                    )
                  ? "Continue"
                  : "View";
              const placeName =
                s.area?.name ?? s.section?.name ?? s.facility.name;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {s.checklist.name}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {s.frequency.replace(/_/g, " ")} ·{" "}
                      <Link
                        href={scopeHref(s)}
                        className="font-medium text-accent hover:text-accent-strong hover:underline"
                        title={`See every task for ${placeName}`}
                      >
                        {placeName}
                      </Link>
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
