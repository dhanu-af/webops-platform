import Link from "next/link";
import { format } from "date-fns";
import {
  ChevronRight,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { listEquipmentCalibrationOverview } from "@/lib/data/calibration";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CALIBRATION_STATUS_META } from "@/lib/status";

export default async function CalibrationPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const equipment = await listEquipmentCalibrationOverview(scope);

  const currentCount = equipment.filter((e) => e.status === "CURRENT").length;
  const dueSoonCount = equipment.filter((e) => e.status === "DUE_SOON").length;
  const overdueCount = equipment.filter((e) => e.status === "OVERDUE").length;
  const neverCount = equipment.filter(
    (e) => e.status === "NEVER_CALIBRATED",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Equipment Calibration
        </h1>
        <p className="text-sm text-muted">
          Calibration history and due dates for every piece of tracked
          equipment.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard
          label="Total Equipment"
          value={equipment.length}
          icon={Wrench}
        />
        <KpiCard
          label="Current"
          value={currentCount}
          icon={CheckCircle2}
          tone="pass"
        />
        <KpiCard
          label="Due Soon"
          value={dueSoonCount}
          icon={Clock}
          tone={dueSoonCount > 0 ? "warn" : "neutral"}
        />
        <KpiCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          tone={overdueCount > 0 ? "critical" : "neutral"}
        />
        <KpiCard
          label="Never Calibrated"
          value={neverCount}
          icon={HelpCircle}
          tone={neverCount > 0 ? "attention" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>All Equipment</CardTitle>
            <CardDescription>
              Click any item for its full calibration history
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {equipment.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No equipment set up yet — add some under Areas &amp; Equipment.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {equipment.map((e) => {
                const statusMeta = CALIBRATION_STATUS_META[e.status];
                return (
                  <Link
                    key={e.id}
                    href={`/calibration/${e.id}`}
                    className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-sunken"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {e.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {e.sectionName} / {e.areaName} · {e.code}
                        {e.latestCalibration && (
                          <>
                            {" "}
                            · last calibrated{" "}
                            {format(
                              e.latestCalibration.calibratedDate,
                              "d MMM yyyy",
                            )}{" "}
                            by {e.latestCalibration.performedBy}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {e.latestCalibration && (
                        <span className="font-mono-tabular text-xs text-muted">
                          due{" "}
                          {format(e.latestCalibration.dueDate, "d MMM yyyy")}
                        </span>
                      )}
                      <Badge tone={statusMeta.tone} dot>
                        {statusMeta.label}
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
    </div>
  );
}
