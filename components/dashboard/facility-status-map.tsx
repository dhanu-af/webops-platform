import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AREA_RELEASE_STATUS_META } from "@/lib/status";
import { formatDistanceToNow } from "date-fns";
import type { getFacilityStatusMap } from "@/lib/data/dashboard";

export function FacilityStatusMap({ areas }: { areas: Awaited<ReturnType<typeof getFacilityStatusMap>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facility Status Map</CardTitle>
        <Link href="/admin/areas" className="text-xs font-medium text-accent hover:underline">
          Manage areas
        </Link>
      </CardHeader>
      <CardContent className="pt-2">
        {areas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No areas configured yet. Set up your facility hierarchy in Areas &amp; Equipment.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {areas.map((area) => {
              const meta = AREA_RELEASE_STATUS_META[area.releaseStatus];
              return (
                <div key={area.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{area.name}</div>
                    <div className="truncate text-xs text-muted">
                      {area.sectionName}
                      {area.responsiblePerson ? ` · ${area.responsiblePerson}` : ""}
                      {area.lastInspectionAt
                        ? ` · last check ${formatDistanceToNow(area.lastInspectionAt, { addSuffix: true })}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {area.openFindings > 0 && (
                      <span className="text-xs font-medium text-status-critical">{area.openFindings} finding{area.openFindings === 1 ? "" : "s"}</span>
                    )}
                    <Badge tone={meta.tone} dot>
                      {meta.label}
                    </Badge>
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
