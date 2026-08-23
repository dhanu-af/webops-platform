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

const FILTERABLE_STATUSES = ["CURRENT", "DUE_SOON", "OVERDUE", "NEVER_CALIBRATED"] as const;
type FilterStatus = (typeof FILTERABLE_STATUSES)[number];

export default async function CalibrationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filterStatus: FilterStatus | null = FILTERABLE_STATUSES.includes(status as FilterStatus) ? (status as FilterStatus) : null;

  const session = await auth();
  const scope = getUserScope(session!.user);
  const equipment = await listEquipmentCalibrationOverview(scope);

  // KPI counts always reflect the full list -- only the grouped list below is filtered.
  const currentCount = equipment.filter((e) => e.status === "CURRENT").length;
  const dueSoonCount = equipment.filter((e) => e.status === "DUE_SOON").length;
  const overdueCount = equipment.filter((e) => e.status === "OVERDUE").length;
  const neverCount = equipment.filter(
    (e) => e.status === "NEVER_CALIBRATED",
  ).length;

  const visibleEquipment = filterStatus ? equipment.filter((e) => e.status === filterStatus) : equipment;
  const groups = groupEquipmentBySectionArea(visibleEquipment);
  const filterLabel = filterStatus ? CALIBRATION_STATUS_META[filterStatus].label : null;

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
          href="/calibration"
          active={!filterStatus}
        />
        <KpiCard
          label="Current"
          value={currentCount}
          icon={CheckCircle2}
          tone="pass"
          href="/calibration?status=CURRENT"
          active={filterStatus === "CURRENT"}
        />
        <KpiCard
          label="Due Soon"
          value={dueSoonCount}
          icon={Clock}
          tone={dueSoonCount > 0 ? "warn" : "neutral"}
          href="/calibration?status=DUE_SOON"
          active={filterStatus === "DUE_SOON"}
        />
        <KpiCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          tone={overdueCount > 0 ? "critical" : "neutral"}
          href="/calibration?status=OVERDUE"
          active={filterStatus === "OVERDUE"}
        />
        <KpiCard
          label="Never Calibrated"
          value={neverCount}
          icon={HelpCircle}
          tone={neverCount > 0 ? "attention" : "neutral"}
          href="/calibration?status=NEVER_CALIBRATED"
          active={filterStatus === "NEVER_CALIBRATED"}
        />
      </div>

      {filterLabel && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">
            Showing <span className="font-medium text-foreground">{visibleEquipment.length}</span> item{visibleEquipment.length === 1 ? "" : "s"} — {filterLabel}
          </span>
          <Link href="/calibration" className="text-accent hover:underline">
            Clear filter
          </Link>
        </div>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <p className="py-10 text-center text-sm text-muted">
              {filterLabel ? (
                <>
                  No equipment is currently {filterLabel.toLowerCase()} —{" "}
                  <Link href="/calibration" className="text-accent hover:underline">
                    clear filter
                  </Link>
                  .
                </>
              ) : (
                <>No equipment set up yet — add some under Areas &amp; Equipment.</>
              )}
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
