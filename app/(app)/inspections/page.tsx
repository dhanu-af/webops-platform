import Link from "next/link";
import { listInspections } from "@/lib/data/inspections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { getFacilityTimezone, formatDayInTimeZone } from "@/lib/timezone";

export default async function InspectionsHistoryPage() {
  const [inspections, timeZone] = await Promise.all([listInspections(), getFacilityTimezone()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Inspection History</h1>
        <p className="text-sm text-muted">Every inspection ever performed — fully traceable.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-2">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Checklist</th>
                <th className="pb-2 font-medium">Area</th>
                <th className="pb-2 font-medium">Operator</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inspections.map((insp) => {
                const meta = INSPECTION_STATUS_META[insp.status];
                return (
                  <tr key={insp.id} className="hover:bg-surface-sunken">
                    <td className="py-2.5">
                      <Link href={`/inspections/${insp.id}`} className="font-medium text-foreground hover:text-accent">
                        {insp.checklistVersion.checklist.name}
                      </Link>
                      {insp.findings.length > 0 && (
                        <span className="ml-2 text-xs text-status-critical">{insp.findings.length} finding{insp.findings.length === 1 ? "" : "s"}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-muted-strong">{insp.area?.name ?? insp.section?.name ?? "—"}</td>
                    <td className="py-2.5 text-muted-strong">{insp.operator?.name ?? "—"}</td>
                    <td className="py-2.5 font-mono-tabular text-muted-strong">{insp.score !== null ? `${insp.score}%` : "—"}</td>
                    <td className="py-2.5">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="py-2.5 font-mono-tabular text-xs text-muted">{formatDayInTimeZone(insp.createdAt, timeZone)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {inspections.length === 0 && <p className="py-8 text-center text-sm text-muted">No inspections recorded yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
