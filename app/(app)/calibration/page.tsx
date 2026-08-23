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
import {
  listEquipmentCalibrationOverview,
  groupEquipmentBySectionArea,
  type EquipmentOverviewItem,
} from "@/lib/data/calibration";
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
import type { StatusTone } from "@/lib/status";

const CRITICALITY_TONE: Record<string, StatusTone> = {
  Critical: "critical",
  Major: "attention",
  Minor: "neutral",
};

function criticalityTone(criticality: string | null): StatusTone {
  if (!criticality) return "neutral";
  const key = Object.keys(CRITICALITY_TONE).find((k) => criticality.startsWith(k));
  return key ? CRITICALITY_TONE[key] : "neutral";
}

function EquipmentRow({ e }: { e: EquipmentOverviewItem }) {
  const statusMeta = CALIBRATION_STATUS_META[e.status];
  const metaParts = [e.code, e.manufacturerModel, e.serialNumber ? `S/N ${e.serialNumber}` : null, e.ppmFrequency, e.serviceProvider].filter(Boolean);

  return (
    <Link
      href={`/calibration/${e.id}`}
      className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-sunken"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
          {e.criticality && <Badge tone={criticalityTone(e.criticality)}>{e.criticality}</Badge>}
          {e.foodSafetyRisk && <Badge tone="warn">Food Safety</Badge>}
        </div>
        <p className="mt-1 truncate text-xs text-muted">{metaParts.join(" · ")}</p>
        {e.comments && <p className="mt-0.5 truncate text-xs text-muted italic">{e.comments}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {e.latestCalibration && (
          <span className="font-mono-tabular text-xs text-muted">
            due {format(e.latestCalibration.dueDate, "d MMM yyyy")}
          </span>
        )}
        <Badge tone={statusMeta.tone} dot>
          {statusMeta.label}
        </Badge>
        <ChevronRight className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export default async function CalibrationPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const equipment = await listEquipmentCalibrationOverview(scope);
  const groups = groupEquipmentBySectionArea(equipment);

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

      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <p className="py-10 text-center text-sm text-muted">
              No equipment set up yet — add some under Areas &amp; Equipment.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map((section) => (
          <div key={section.sectionName} className="space-y-3">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              {section.sectionName}
            </h2>
            <div className="space-y-4">
              {section.areas.map((area) => (
                <Card key={area.areaId}>
                  <CardHeader>
                    <div>
                      <CardTitle>{area.areaName}</CardTitle>
                      <CardDescription>
                        {area.equipment.length} item{area.equipment.length === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {area.equipment.map((e) => (
                        <EquipmentRow key={e.id} e={e} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
