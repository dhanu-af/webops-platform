import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { StartScheduleButton } from "@/components/inspection/start-schedule-button";
import { NoProductionButton } from "@/components/inspection/no-production-button";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

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

export async function ScheduleList({
  schedules,
  emptyLabel,
}: {
  schedules: Schedule[];
  emptyLabel: string;
}) {
  // Start / No production are only offered to roles that may create inspections.
  const session = await auth();
  const canCreate = !!session?.user && can(session.user.role, "inspection.create");
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
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end sm:gap-3">
                    {meta && <Badge tone={meta.tone}>{meta.label}</Badge>}
                    {canCreate && label !== "View" && <NoProductionButton scheduleId={s.id} />}
                    {(canCreate || label === "View") && <StartScheduleButton scheduleId={s.id} label={label} />}
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
