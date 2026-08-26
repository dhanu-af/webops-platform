"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DryingBayPurpose, DryingStage, TrolleyQcStatus } from "@/app/generated/prisma/client";
import { computeBatchAlerts, computeBayAlerts, type DryingAlert } from "@/lib/drying-room-defaults";
import type { DryingRoomMetrics } from "@/lib/actions/drying-room-actions";
import { Card, CardContent } from "@/components/ui/card";
import DashboardTab from "./dashboard-tab";
import BaysTab from "./bays-tab";
import BayDetailModal from "./bay-detail-modal";
import MiscTab from "./misc-tab";
import ReportTab from "./report-tab";

export type Employee = { id: string; name: string };

export type Trolley = {
  id: string;
  trolleyNumber: number;
  quantity: number | null;
  trayCount: number | null;
  wrapped: boolean;
  rotationCompleted: boolean;
  qcStatus: TrolleyQcStatus;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  remarks: string | null;
};

export type Batch = {
  id: string;
  productName: string;
  batchNumber: string;
  batchSize: number;
  batchSizeUnit: string;
  numberOfTrolleys: number;
  trayCount: number;
  dateEnteredDryingRoom: string;
  dryingStartTime: string | null;
  currentStage: DryingStage;
  stageUpdatedAt: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  priorityRank: number | null;
  remarks: string | null;
  trolleys: Trolley[];
};

export type Bay = {
  id: string;
  bayNumber: number;
  purpose: DryingBayPurpose;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  department: string | null;
  comments: string | null;
  expectedFinishTime: string | null;
  updatedAt: string;
  batches: Batch[];
};

export type MiscItem = {
  id: string;
  product: string;
  batchNumber: string | null;
  quantityLabel: string;
  storageType: string | null;
  status: string | null;
  requiredAction: string | null;
  location: string | null;
  remarks: string | null;
  updatedAt: string;
};

const TABS = ["dashboard", "bays", "misc", "report"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { dashboard: "Dashboard", bays: "Bays", misc: "Misc Storage", report: "Reports" };

export default function DryingRoomClient({
  bays,
  misc,
  employees,
  canUpdate,
  canManage,
  metrics,
}: {
  bays: Bay[];
  misc: MiscItem[];
  employees: Employee[];
  canUpdate: boolean;
  canManage: boolean;
  metrics: DryingRoomMetrics;
}) {
  const searchParams = useSearchParams();
  const bayParam = searchParams.get("bay");
  const [tab, setTab] = useState<Tab>(bayParam ? "bays" : "dashboard");
  const [openBayId, setOpenBayId] = useState<string | null>(bayParam);

  const allBatches = useMemo(() => bays.flatMap((b) => b.batches), [bays]);

  const alerts = useMemo<DryingAlert[]>(() => {
    const bayAlerts = bays.flatMap((b) => computeBayAlerts(b.bayNumber, b.purpose, b.batches));
    const batchAlerts = allBatches.flatMap((b) => computeBatchAlerts(b));
    return [...bayAlerts, ...batchAlerts];
  }, [bays, allBatches]);

  const openBay = bays.find((b) => b.id === openBayId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Production Staging Operations</h1>
        <p className="text-sm text-muted">Monitor production bays, batch progress, and live operational status.</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted/70">Alerts ({alerts.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {alerts.map((a) => (
                <span
                  key={a.key + a.label}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    a.severity === "danger" ? "border-status-critical/30 bg-status-critical-soft text-status-critical" : "border-status-warn/30 bg-status-warn-soft text-status-warn"
                  }`}
                >
                  {a.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "dashboard" && <DashboardTab bays={bays} allBatches={allBatches} alerts={alerts} metrics={metrics} />}
      {tab === "bays" && <BaysTab bays={bays} canManage={canManage} onOpenBay={setOpenBayId} />}
      {tab === "misc" && <MiscTab items={misc} canUpdate={canUpdate} canManage={canManage} />}
      {tab === "report" && <ReportTab bays={bays} misc={misc} />}

      {openBay && <BayDetailModal bay={openBay} allBays={bays} employees={employees} canUpdate={canUpdate} canManage={canManage} onClose={() => setOpenBayId(null)} />}
    </div>
  );
}
