"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MfgBatchStatus } from "@/app/generated/prisma/client";
import { DashboardTab } from "./dashboard-tab";
import { BatchesTab } from "./batches-tab";

export type MfgBatchRow = {
  id: string;
  batchNumber: string;
  productName: string;
  status: MfgBatchStatus;
  createdAt: string;
  blending: { totalTheoreticalWeightKg: number | null; totalBlendProducedKg: number | null } | null;
  encapsulation: {
    issuedBulkBlendKg: number | null;
    targetCapsuleFillWeightMg: number | null;
    capsulesProducedKg: number | null;
    avgCapsuleFullWeightMg: number | null;
  } | null;
  bottling: { capsuleReceivedKg: number | null; avgCapsuleFullWeightMg: number | null; targetCapsulesPerBottle: number | null; bottlesProduced: number | null } | null;
  qaReleased: boolean;
};

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "batches", label: "Batches" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function MfgReconciliationClient({ batches, canManage }: { batches: MfgBatchRow[]; canManage: boolean }) {
  const [tab, setTab] = useState<TabKey>("dashboard");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Manufacturing Reconciliation</h1>
        <p className="text-sm text-muted">End-to-end batch traceability — Warehouse Issue through Dispatch, every material and stage reconciled.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-border-strong text-muted-strong hover:bg-surface-sunken"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab batches={batches} />}
      {tab === "batches" && <BatchesTab batches={batches} canManage={canManage} />}
    </div>
  );
}
