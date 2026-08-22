import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AREA_RELEASE_STATUS_META } from "@/lib/status";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { getFacilityStatusMap } from "@/lib/data/dashboard";

// Professional status colours, sparingly: green = released/compliant, amber =
// pending, red = not released/critical, neutral = no data yet.
const RAIL_CLASS: Record<string, string> = {
  QA_RELEASED: "bg-status-pass",
  AWAITING_QA: "bg-status-attention",
  AWAITING_SUPERVISOR: "bg-status-warn",
  NOT_RELEASED: "bg-status-critical",
};

export function FacilityStatusMap({
  areas,
}: {
  areas: Awaited<ReturnType<typeof getFacilityStatusMap>>;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Facility Status Map</CardTitle>
          <CardDescription>
            Live release status across every tracked area
          </CardDescription>
        </div>
        <Link
          href="/admin/areas"
          className="text-xs font-medium text-accent hover:text-accent-strong"
        >
          Manage areas
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {areas.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            No areas configured yet. Set up your facility hierarchy in Areas
            &amp; Equipment.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {areas.map((area) => {
              const meta = AREA_RELEASE_STATUS_META[area.releaseStatus];
              return (
                <Link
                  key={area.id}
                  href={`/inspections?areaId=${area.id}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-sunken"
                >
                  <span
                    className={cn(
                      "h-8 w-1 shrink-0 rounded-full",
                      RAIL_CLASS[area.releaseStatus] ?? "bg-status-neutral",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {area.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-strong">
                        {area.sectionName}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <CircleDot className="size-3 shrink-0" />
                      {area.responsiblePerson
                        ? `${area.responsiblePerson} · `
                        : ""}
                      {area.lastInspectionAt
                        ? `last check ${formatDistanceToNow(area.lastInspectionAt, { addSuffix: true })}`
                        : "no checks recorded yet"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {area.openFindings > 0 && (
                      <span className="text-xs font-medium text-status-critical">
                        {area.openFindings} finding
                        {area.openFindings === 1 ? "" : "s"}
                      </span>
                    )}
                    <Badge tone={meta.tone} dot>
                      {meta.label}
                    </Badge>
                    <ChevronRight className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
