"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PRIORITY_BADGE, STAGE_LABEL, computeBatchAlerts, type DryingAlert } from "@/lib/drying-room-defaults";
import type { DryingRoomMetrics } from "@/lib/actions/drying-room-actions";
import type { Bay, Batch } from "./drying-room-client";

function StatCard({ label, value, highlight, onClick }: { label: string; value: number | string; highlight?: boolean; onClick?: () => void }) {
  return (
    <Card interactive={!!onClick} className={onClick ? "cursor-pointer" : undefined} onClick={onClick}>
      <CardContent className={highlight ? "border-l-2 border-status-warn" : undefined}>
        <p className={`text-2xl font-semibold tabular-nums ${highlight ? "text-status-warn" : "text-foreground"}`}>{value}</p>
        <p className={`text-xs ${highlight ? "text-status-warn/80" : "text-muted"}`}>{label}</p>
      </CardContent>
    </Card>
  );
}

function formatHours(hours: number | null): string {
  if (hours === null) return "Not enough data yet";
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function DashboardTab({
  bays,
  allBatches,
  alerts,
  metrics,
}: {
  bays: Bay[];
  allBatches: Batch[];
  alerts: DryingAlert[];
  metrics: DryingRoomMetrics;
}) {
  const [showPriorityList, setShowPriorityList] = useState(false);

  const priorityJobs = bays
    .flatMap((bay) => bay.batches.map((batch) => ({ ...batch, bayNumber: bay.bayNumber })))
    .filter((b) => b.priorityRank !== null)
    .sort((a, b) => (a.priorityRank ?? 99) - (b.priorityRank ?? 99));

  const totalBays = bays.length;
  const occupiedBays = bays.filter((b) => b.batches.length > 0).length;
  const emptyBays = bays.filter((b) => b.purpose === "EMPTY" && b.batches.length === 0).length;
  const dryingCount = allBatches.filter((b) => b.currentStage === "DRYING" || b.currentStage === "CONTINUE_DRYING").length;
  const waitingQcCount = allBatches.filter((b) => b.currentStage === "QC_SAMPLING" || b.currentStage === "QC_PENDING").length;
  const readyForPouchingCount = allBatches.filter((b) => b.currentStage === "READY_FOR_POUCHING").length;
  const cleaningRequiredCount = bays.filter((b) => b.purpose === "CLEANING_REQUIRED").length;
  const rotationRequiredCount = allBatches.filter((b) => b.currentStage === "ROTATION_REQUIRED").length;
  const wrappedTrolleys = allBatches.reduce((s, b) => s + b.trolleys.filter((t) => t.wrapped).length, 0);
  const onHoldCount = allBatches.filter((b) => b.currentStage === "QC_HOLD").length;
  const overdueBatchIds = new Set(allBatches.filter((b) => computeBatchAlerts(b).some((a) => a.severity === "danger")).map((b) => b.id));
  const totalTrolleys = allBatches.reduce((s, b) => s + b.numberOfTrolleys, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Live Summary</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard label="Total Bays" value={totalBays} />
          <StatCard label="Occupied Bays" value={occupiedBays} />
          <StatCard label="Empty Bays" value={emptyBays} />
          <StatCard label="Drying" value={dryingCount} />
          <StatCard label="Waiting QC" value={waitingQcCount} />
          <StatCard label="Ready for Pouching" value={readyForPouchingCount} />
          <StatCard label="Cleaning Required" value={cleaningRequiredCount} />
          <StatCard label="Rotation Required" value={rotationRequiredCount} />
          <StatCard label="Wrapped Products" value={wrappedTrolleys} />
          <StatCard label="Overdue Batches" value={overdueBatchIds.size} />
          <StatCard label="Priority Jobs" value={priorityJobs.length} highlight onClick={() => setShowPriorityList((v) => !v)} />
        </div>

        {showPriorityList && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-status-warn/30 bg-status-warn-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-status-warn/80">Priority Jobs ({priorityJobs.length})</p>
            {priorityJobs.length === 0 ? (
              <p className="text-xs text-muted">No batches have a priority set right now.</p>
            ) : (
              priorityJobs.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-1 rounded-md border border-border/60 bg-surface-sunken/60 px-2 py-1.5 text-xs">
                  <span className="font-medium text-foreground">
                    {PRIORITY_BADGE[b.priorityRank!]} {b.productName} · Batch {b.batchNumber}
                  </span>
                  <span className="text-muted">
                    Bay {b.bayNumber} · {STAGE_LABEL[b.currentStage]}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Dashboard KPIs</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard label="Total Products in Drying" value={dryingCount + rotationRequiredCount} />
          <StatCard label="Total Trolleys" value={totalTrolleys} />
          <StatCard label="Bays Available" value={emptyBays} />
          <StatCard label="Products Waiting QC" value={waitingQcCount} />
          <StatCard label="Products Ready for Pouching" value={readyForPouchingCount} />
          <StatCard label="Products on Hold" value={onHoldCount} />
          <StatCard label="Cleaning Tasks" value={cleaningRequiredCount} />
          <StatCard label="Overdue Batches" value={overdueBatchIds.size} />
          <StatCard label="Avg. Drying Time" value={formatHours(metrics.avgDryingTimeHours)} />
          <StatCard label="Avg. Time to QC" value={formatHours(metrics.avgTimeToQcHours)} />
          <StatCard label="Throughput Today" value={metrics.throughputToday} />
          <StatCard label="Throughput This Week" value={metrics.throughputThisWeek} />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Throughput counts batches marked Complete. Drying Time and Time to QC are computed from each batch&apos;s recorded stage changes (up to the last 200 completed
          batches) — reads &quot;Not enough data yet&quot; if a batch was completed without its stage changes ever being tracked here.
        </p>
      </div>

      {alerts.length === 0 && <p className="text-xs text-muted">No active alerts — everything is on schedule.</p>}
    </div>
  );
}
