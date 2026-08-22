import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { listEquipmentCalibrationOverview } from "@/lib/data/calibration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CALIBRATION_STATUS_META } from "@/lib/status";
import { CALIBRATION_DUE_SOON_DAYS } from "@/lib/calibration";

export default async function CalibrationPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const equipment = await listEquipmentCalibrationOverview(scope);

  const overdueCount = equipment.filter((e) => e.status === "OVERDUE").length;
  const dueSoonCount = equipment.filter((e) => e.status === "DUE_SOON").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Equipment Calibration</h1>
        <p className="text-sm text-muted">Calibration history and due dates for every piece of tracked equipment.</p>
      </div>

      {(overdueCount > 0 || dueSoonCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {overdueCount > 0 && (
            <div className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm font-medium text-status-critical">
              {overdueCount} overdue
            </div>
          )}
          {dueSoonCount > 0 && (
            <div className="rounded-lg bg-status-warn-soft px-3 py-2 text-sm font-medium text-status-warn">
              {dueSoonCount} due within {CALIBRATION_DUE_SOON_DAYS} days
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Equipment</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {equipment.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No equipment set up yet — add some under Areas &amp; Equipment.</p>
          ) : (
            <div className="divide-y divide-border">
              {equipment.map((e) => {
                const statusMeta = CALIBRATION_STATUS_META[e.status];
                return (
                  <Link
                    key={e.id}
                    href={`/calibration/${e.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 hover:bg-surface-sunken"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {e.sectionName} / {e.areaName} · {e.code}
                        {e.latestCalibration && (
                          <>
                            {" "}
                            · last calibrated {format(e.latestCalibration.calibratedDate, "d MMM yyyy")} by {e.latestCalibration.performedBy}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {e.latestCalibration && (
                        <span className="text-xs text-muted">due {format(e.latestCalibration.dueDate, "d MMM yyyy")}</span>
                      )}
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
