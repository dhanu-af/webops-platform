import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AUDIT_ACTION_META } from "@/lib/status";
import { formatTimeInTimeZone } from "@/lib/timezone";
import type { getRecentActivity } from "@/lib/data/recent-activity";

type Activity = Awaited<ReturnType<typeof getRecentActivity>>[number];

function describe(entry: Activity): string {
  const label = AUDIT_ACTION_META[entry.action]?.label ?? entry.action.replace(/_/g, " ");
  if (entry.checklistName) return `${label} — ${entry.checklistName}`;
  return `${label} — ${entry.entityType}`;
}

export function RecentActivityTimeline({ activity, timeZone }: { activity: Activity[]; timeZone: string }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions across the facility</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-0">
            {activity.map((entry, i) => (
              <li key={entry.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                {i < activity.length - 1 && (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-border" aria-hidden />
                )}
                <span className="relative z-10 mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-accent" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono-tabular text-[11px] text-muted">{formatTimeInTimeZone(entry.createdAt, timeZone)}</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-foreground">{describe(entry)}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {entry.actorName}
                    {entry.areaName ? ` · ${entry.areaName}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
