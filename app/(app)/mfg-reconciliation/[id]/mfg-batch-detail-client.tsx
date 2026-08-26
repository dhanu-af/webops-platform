"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { MfgBatchStatus } from "@/app/generated/prisma/client";
import { deleteMfgBatch, markMfgBatchCompleted } from "@/lib/actions/mfg-reconciliation";
import { MFG_BATCH_STATUS_LABEL, type MfgStageKey } from "@/lib/mfg-reconciliation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WarehouseIssueSection, type WarehouseIssueData } from "./warehouse-issue-section";
import { BlendingSection, type BlendingData } from "./blending-section";
import { EncapsulationSection, type EncapsulationData } from "./encapsulation-section";
import { BottlingSection, type BottlingData } from "./bottling-section";
import { XraySection, type XrayData } from "./xray-section";
import { PackagingSection, type PackagingData } from "./packaging-section";
import { FgWarehouseSection, type FgWarehouseData } from "./fg-warehouse-section";
import { DispatchSection, type DispatchEventData } from "./dispatch-section";
import { FinalReconciliationTab } from "./final-reconciliation-tab";

export type MfgBatchDetail = {
  id: string;
  batchNumber: string;
  productName: string;
  status: MfgBatchStatus;
  remarks: string | null;
  formulationReference: string | null;
  createdByName: string;
  createdAt: string;
  warehouseIssue: WarehouseIssueData | null;
  blending: BlendingData | null;
  encapsulation: EncapsulationData | null;
  bottling: BottlingData | null;
  xrayInspection: XrayData | null;
  packaging: PackagingData | null;
  finishedGoodsWarehouse: FgWarehouseData | null;
  dispatchEvents: DispatchEventData[];
};

const STAGES = [
  { key: "warehouseIssue", label: "1. Warehouse Issue" },
  { key: "blending", label: "2. Blending" },
  { key: "encapsulation", label: "3. Encapsulation" },
  { key: "bottling", label: "4. Bottling" },
  { key: "xray", label: "5. X-Ray / Metal Detection" },
  { key: "packaging", label: "6. Packaging" },
  { key: "fgWarehouse", label: "7. Finished Goods Warehouse" },
  { key: "dispatch", label: "8. Dispatch" },
  { key: "finalReconciliation", label: "Final Reconciliation" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];

export type AuditEntry = { id: string; reason: string | null; createdAt: string; userName: string };

export function MfgBatchDetailClient({
  batch,
  auditTrail,
  canManageBatch,
  canEditStage,
}: {
  batch: MfgBatchDetail;
  auditTrail: AuditEntry[];
  canManageBatch: boolean;
  canEditStage: Record<MfgStageKey, boolean>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [stage, setStage] = useState<StageKey>("warehouseIssue");

  function complete() {
    setError("");
    startTransition(async () => {
      try {
        await markMfgBatchCompleted(batch.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function remove() {
    if (!confirm(`Delete manufacturing batch ${batch.batchNumber}? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteMfgBatch(batch.id);
        router.push("/mfg-reconciliation");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => router.push("/mfg-reconciliation")} className="text-xs font-medium text-muted hover:text-foreground">
        ← Back to Manufacturing Reconciliation
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {batch.batchNumber} <span className="font-normal text-muted">— {batch.productName}</span>
          </h1>
          {batch.formulationReference && <p className="text-xs text-muted">Formulation/BOM Reference: {batch.formulationReference}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={batch.status === "COMPLETED" ? "pass" : "accent"}>{MFG_BATCH_STATUS_LABEL[batch.status]}</Badge>
          <a
            href={`/api/reports/mfg-reconciliation/pdf?id=${batch.id}`}
            className="inline-flex items-center rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-sunken"
          >
            Download PDF
          </a>
          {canManageBatch && batch.status === "IN_PROGRESS" && (
            <Button variant="secondary" size="sm" onClick={complete} disabled={pending}>
              Mark Completed
            </Button>
          )}
          {canManageBatch && (
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-medium text-status-critical hover:opacity-80 disabled:opacity-40">
              Delete Batch
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-status-critical">{error}</p>}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {STAGES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStage(s.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              stage === s.key ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-border-strong text-muted-strong hover:bg-surface-sunken"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
        {stage !== "finalReconciliation" && !canEditStage[stage] && (
          <p className="mb-3 rounded-lg bg-surface-sunken px-3 py-2 text-xs text-muted">
            Read-only for your account — only staff assigned to this stage&apos;s section (or a supervisor/QA/management) can edit it.
          </p>
        )}
        {stage === "warehouseIssue" && <WarehouseIssueSection batchId={batch.id} data={batch.warehouseIssue} canManage={canEditStage.warehouseIssue} />}
        {stage === "blending" && <BlendingSection batchId={batch.id} data={batch.blending} canManage={canEditStage.blending} />}
        {stage === "encapsulation" && (
          <EncapsulationSection
            batchId={batch.id}
            data={batch.encapsulation}
            canManage={canEditStage.encapsulation}
            priorStageBulkBlendKg={batch.blending?.totalBlendProducedKg ?? null}
          />
        )}
        {stage === "bottling" && (
          <BottlingSection
            batchId={batch.id}
            data={batch.bottling}
            canManage={canEditStage.bottling}
            priorStageCapsulesKg={batch.encapsulation?.capsulesProducedKg ?? null}
          />
        )}
        {stage === "xray" && (
          <XraySection
            batchId={batch.id}
            data={batch.xrayInspection}
            canManage={canEditStage.xray}
            priorStageBottlesProduced={batch.bottling?.bottlesProduced ?? null}
          />
        )}
        {stage === "packaging" && (
          <PackagingSection
            batchId={batch.id}
            data={batch.packaging}
            canManage={canEditStage.packaging}
            priorStageReleased={batch.xrayInspection?.released ?? null}
          />
        )}
        {stage === "fgWarehouse" && (
          <FgWarehouseSection
            batchId={batch.id}
            data={batch.finishedGoodsWarehouse}
            canManage={canEditStage.fgWarehouse}
            priorStagePackedBottles={batch.packaging?.packedBottles ?? null}
          />
        )}
        {stage === "dispatch" && <DispatchSection batchId={batch.id} events={batch.dispatchEvents} canManage={canEditStage.dispatch} />}
        {stage === "finalReconciliation" && (
          <FinalReconciliationTab blending={batch.blending} encapsulation={batch.encapsulation} bottling={batch.bottling} />
        )}
      </div>

      <div className="space-y-2 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Audit Trail</p>
        {auditTrail.length === 0 ? (
          <p className="text-xs text-muted">No history yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {auditTrail.map((a) => (
              <li key={a.id} className="text-foreground">
                <span className="text-xs text-muted">{new Date(a.createdAt).toLocaleString()} — </span>
                {a.reason ?? `${a.userName} made a change`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
