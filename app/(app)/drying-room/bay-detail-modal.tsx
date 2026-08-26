"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DryingBayPurpose, DryingStage, TrolleyQcStatus } from "@/app/generated/prisma/client";
import {
  updateBayPurpose,
  updateBatchStage,
  deleteBatch,
  moveBatchToBay,
  updateBatchPriority,
  updateBatchRemarks,
  updateTrolley,
} from "@/lib/actions/drying-room-actions";
import { PURPOSE_LABEL, STAGE_LABEL, STAGE_ACTIONS, PRIORITY_LABEL, PRIORITY_BADGE, computeBatchAlerts, daysSinceProduction } from "@/lib/drying-room-defaults";
import { Button } from "@/components/ui/button";
import { Field, MFG_INPUT_CLASS } from "@/components/mfg/field";
import AddBatchModal from "./add-batch-modal";
import type { Bay, Batch, Trolley, Employee } from "./drying-room-client";

const PURPOSE_OPTIONS: DryingBayPurpose[] = ["EMPTY", "DRYING", "WAITING_QC", "READY_FOR_POUCHING", "READY_FOR_PRODUCTION", "CLEANING_REQUIRED", "RND", "STORAGE", "SERVICE", "QUARANTINE"];
const STAGE_OPTIONS: DryingStage[] = ["RECEIVING", "DRYING", "ROTATION_REQUIRED", "CONTINUE_DRYING", "QC_SAMPLING", "QC_PENDING", "QC_APPROVED", "QC_HOLD", "WRAPPING", "READY_FOR_POUCHING", "POUCHING", "COMPLETE"];

export default function BayDetailModal({
  bay,
  allBays,
  employees,
  canUpdate,
  canManage,
  onClose,
}: {
  bay: Bay;
  allBays: Bay[];
  employees: Employee[];
  canUpdate: boolean;
  canManage: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [purpose, setPurpose] = useState<DryingBayPurpose>(bay.purpose);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(bay.assignedEmployeeId ?? "");
  const [department, setDepartment] = useState(bay.department ?? "");
  const [comments, setComments] = useState(bay.comments ?? "");
  const [expectedFinishTime, setExpectedFinishTime] = useState(bay.expectedFinishTime ? bay.expectedFinishTime.slice(0, 16) : "");
  const [showAddBatch, setShowAddBatch] = useState(false);

  function saveBayInfo() {
    setError("");
    startTransition(async () => {
      try {
        await updateBayPurpose(bay.id, {
          purpose,
          assignedEmployeeId: assignedEmployeeId || null,
          department: department || null,
          comments: comments || null,
          expectedFinishTime: expectedFinishTime || null,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save bay info.");
      }
    });
  }

  function setStage(batchId: string, stage: DryingStage) {
    setError("");
    startTransition(async () => {
      try {
        await updateBatchStage(batchId, stage);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't update stage.");
      }
    });
  }

  function removeBatch(batchId: string) {
    if (!confirm("Remove this batch from Production Staging? This cannot be undone.")) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteBatch(batchId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't remove batch.");
      }
    });
  }

  function moveBatch(batchId: string, bayId: string) {
    setError("");
    startTransition(async () => {
      try {
        await moveBatchToBay(batchId, bayId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't move batch.");
      }
    });
  }

  function setPriority(batchId: string, priorityRank: number | null) {
    setError("");
    startTransition(async () => {
      try {
        await updateBatchPriority(batchId, priorityRank);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't set priority.");
      }
    });
  }

  function setRemarks(batchId: string, remarks: string | null) {
    setError("");
    startTransition(async () => {
      try {
        await updateBatchRemarks(batchId, remarks);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save remarks.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-md)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Bay {bay.bayNumber}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted/70">General Information</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Purpose">
                <select value={purpose} onChange={(e) => setPurpose(e.target.value as DryingBayPurpose)} disabled={!canUpdate} className={MFG_INPUT_CLASS}>
                  {PURPOSE_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {PURPOSE_LABEL[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned Operator">
                <select value={assignedEmployeeId} onChange={(e) => setAssignedEmployeeId(e.target.value)} disabled={!canUpdate} className={MFG_INPUT_CLASS}>
                  <option value="">Unassigned</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned Department">
                <input value={department} onChange={(e) => setDepartment(e.target.value)} disabled={!canUpdate} placeholder="e.g. Packaging" className={MFG_INPUT_CLASS} />
              </Field>
              <Field label="Expected Finish Time">
                <input type="datetime-local" value={expectedFinishTime} onChange={(e) => setExpectedFinishTime(e.target.value)} disabled={!canUpdate} className={MFG_INPUT_CLASS} />
              </Field>
              <div className="col-span-2">
                <Field label="Comments">
                  <textarea value={comments} onChange={(e) => setComments(e.target.value)} disabled={!canUpdate} rows={2} placeholder="Notes for this bay..." className={MFG_INPUT_CLASS} />
                </Field>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted">Last updated {new Date(bay.updatedAt).toLocaleString()}</p>
            {canUpdate && (
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={saveBayInfo} disabled={pending}>
                  {pending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted/70">Batches ({bay.batches.length})</p>
              {canUpdate && (
                <Button size="sm" variant="secondary" onClick={() => setShowAddBatch(true)}>
                  + Add Batch
                </Button>
              )}
            </div>

            {bay.batches.length === 0 ? (
              <p className="text-xs text-muted">No batches in this bay.</p>
            ) : (
              <div className="space-y-3">
                {bay.batches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    otherBays={allBays.filter((b) => b.id !== bay.id)}
                    employees={employees}
                    canUpdate={canUpdate}
                    canManage={canManage}
                    onSetStage={setStage}
                    onRemove={removeBatch}
                    onMoveBay={moveBatch}
                    onSetPriority={setPriority}
                    onSetRemarks={setRemarks}
                    onRefresh={() => router.refresh()}
                  />
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-status-critical">{error}</p>}
        </div>

        {showAddBatch && (
          <AddBatchModal
            bayId={bay.id}
            employees={employees}
            onClose={() => setShowAddBatch(false)}
            onCreated={() => {
              setShowAddBatch(false);
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

function BatchCard({
  batch,
  otherBays,
  employees,
  canUpdate,
  canManage,
  onSetStage,
  onRemove,
  onMoveBay,
  onSetPriority,
  onSetRemarks,
  onRefresh,
}: {
  batch: Batch;
  otherBays: Bay[];
  employees: Employee[];
  canUpdate: boolean;
  canManage: boolean;
  onSetStage: (batchId: string, stage: DryingStage) => void;
  onRemove: (batchId: string) => void;
  onMoveBay: (batchId: string, bayId: string) => void;
  onSetPriority: (batchId: string, priorityRank: number | null) => void;
  onSetRemarks: (batchId: string, remarks: string | null) => void;
  onRefresh: () => void;
}) {
  const [showTrolleys, setShowTrolleys] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");
  const [stageTarget, setStageTarget] = useState("");
  const [remarksDraft, setRemarksDraft] = useState(batch.remarks ?? "");
  const actions = STAGE_ACTIONS[batch.currentStage] ?? [];
  const alerts = computeBatchAlerts(batch);
  const days = daysSinceProduction(batch.dateEnteredDryingRoom);

  return (
    <div className="rounded-lg border border-border bg-surface-sunken/40 p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {batch.priorityRank && `${PRIORITY_BADGE[batch.priorityRank]} `}
            {batch.productName} · Batch {batch.batchNumber}
          </p>
          <p className="text-muted">
            {batch.batchSize} {batch.batchSizeUnit} · {batch.numberOfTrolleys} trolleys · {batch.trayCount} trays · {days} day{days === 1 ? "" : "s"}
          </p>
          <p className="mt-1 flex flex-wrap gap-1">
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-foreground">{STAGE_LABEL[batch.currentStage]}</span>
            {batch.priorityRank && (
              <span className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-strong">{PRIORITY_LABEL[batch.priorityRank]}</span>
            )}
          </p>
        </div>
        {canManage && (
          <button onClick={() => onRemove(batch.id)} className="text-[11px] font-medium text-muted hover:text-status-critical">
            Remove
          </button>
        )}
      </div>

      {canUpdate && (
        <div className="mt-2 flex items-center gap-1.5">
          <select value={batch.priorityRank ?? ""} onChange={(e) => onSetPriority(batch.id, e.target.value ? Number(e.target.value) : null)} className={`${MFG_INPUT_CLASS} py-1 text-[11px]`}>
            <option value="">No priority</option>
            <option value="1">1st Priority</option>
            <option value="2">2nd Priority</option>
            <option value="3">3rd Priority</option>
          </select>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {alerts.map((a) => (
            <span
              key={a.key}
              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                a.severity === "danger" ? "border-status-critical/30 bg-status-critical-soft text-status-critical" : "border-status-warn/30 bg-status-warn-soft text-status-warn"
              }`}
            >
              {a.key === "waiting-too-long" ? "Waiting Too Long" : a.label.split("—")[1]?.trim() ?? a.label}
            </span>
          ))}
        </div>
      )}

      {canUpdate && actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {actions.map((a) => (
            <Button key={a.target} size="sm" variant="secondary" onClick={() => onSetStage(batch.id, a.target)}>
              {a.label}
            </Button>
          ))}
        </div>
      )}

      {canUpdate && (
        <div className="mt-2 flex items-center gap-1.5">
          <select value={stageTarget} onChange={(e) => setStageTarget(e.target.value)} className={`${MFG_INPUT_CLASS} py-1 text-[11px]`}>
            <option value="">Move to stage...</option>
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!stageTarget}
            onClick={() => {
              onSetStage(batch.id, stageTarget as DryingStage);
              setStageTarget("");
            }}
          >
            Set
          </Button>
        </div>
      )}

      {canUpdate && otherBays.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} className={`${MFG_INPUT_CLASS} py-1 text-[11px]`}>
            <option value="">Move to bay...</option>
            {otherBays.map((b) => (
              <option key={b.id} value={b.id}>
                Bay {b.bayNumber}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!moveTarget}
            onClick={() => {
              onMoveBay(batch.id, moveTarget);
              setMoveTarget("");
            }}
          >
            Move
          </Button>
        </div>
      )}

      {canUpdate && (
        <div className="mt-2">
          <textarea value={remarksDraft} onChange={(e) => setRemarksDraft(e.target.value)} placeholder="Remarks / comments..." rows={2} className={`${MFG_INPUT_CLASS} py-1 text-[11px]`} />
          {remarksDraft !== (batch.remarks ?? "") && (
            <div className="mt-1 text-right">
              <Button size="sm" variant="secondary" onClick={() => onSetRemarks(batch.id, remarksDraft || null)}>
                Save Remarks
              </Button>
            </div>
          )}
        </div>
      )}

      <button onClick={() => setShowTrolleys((s) => !s)} className="mt-2 text-[11px] font-medium text-accent hover:underline">
        {showTrolleys ? "Hide" : "Show"} {batch.trolleys.length} trolley record{batch.trolleys.length === 1 ? "" : "s"}
      </button>

      {showTrolleys && (
        <div className="mt-2 space-y-1.5">
          {batch.trolleys.map((t) => (
            <TrolleyRow key={t.id} trolley={t} employees={employees} canUpdate={canUpdate} onSaved={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrolleyRow({ trolley, employees, canUpdate, onSaved }: { trolley: Trolley; employees: Employee[]; canUpdate: boolean; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState<number | "">(trolley.quantity ?? "");
  const [trayCount, setTrayCount] = useState<number | "">(trolley.trayCount ?? "");
  const [wrapped, setWrapped] = useState(trolley.wrapped);
  const [rotationCompleted, setRotationCompleted] = useState(trolley.rotationCompleted);
  const [qcStatus, setQcStatus] = useState<TrolleyQcStatus>(trolley.qcStatus);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(trolley.assignedEmployeeId ?? "");
  const [remarks, setRemarks] = useState(trolley.remarks ?? "");

  function save() {
    startTransition(async () => {
      await updateTrolley(trolley.id, {
        quantity: quantity === "" ? null : Number(quantity),
        trayCount: trayCount === "" ? null : Number(trayCount),
        wrapped,
        rotationCompleted,
        qcStatus,
        assignedEmployeeId: assignedEmployeeId || null,
        remarks: remarks || null,
      });
      onSaved();
    });
  }

  return (
    <div className="rounded-md border border-border bg-surface p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground">Trolley {trolley.trolleyNumber}</span>
        {canUpdate && (
          <Button size="sm" variant="secondary" onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={!canUpdate}
          placeholder="Qty"
          className={`${MFG_INPUT_CLASS} py-1 text-[11px]`}
        />
        <input
          type="number"
          value={trayCount}
          onChange={(e) => setTrayCount(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={!canUpdate}
          placeholder="Trays"
          className={`${MFG_INPUT_CLASS} py-1 text-[11px]`}
        />
        <select value={qcStatus} onChange={(e) => setQcStatus(e.target.value as TrolleyQcStatus)} disabled={!canUpdate} className={`${MFG_INPUT_CLASS} py-1 text-[11px]`}>
          <option value="PENDING">QC Pending</option>
          <option value="PASSED">QC Passed</option>
          <option value="FAILED">QC Failed</option>
        </select>
        <select value={assignedEmployeeId} onChange={(e) => setAssignedEmployeeId(e.target.value)} disabled={!canUpdate} className={`${MFG_INPUT_CLASS} py-1 text-[11px]`}>
          <option value="">Unassigned</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-[11px] text-foreground">
          <input type="checkbox" checked={wrapped} onChange={(e) => setWrapped(e.target.checked)} disabled={!canUpdate} />
          Wrapped
        </label>
        <label className="flex items-center gap-1 text-[11px] text-foreground">
          <input type="checkbox" checked={rotationCompleted} onChange={(e) => setRotationCompleted(e.target.checked)} disabled={!canUpdate} />
          Rotation Completed
        </label>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={!canUpdate}
          placeholder="Remarks"
          className={`${MFG_INPUT_CLASS} min-w-[120px] flex-1 py-1 text-[11px]`}
        />
      </div>
    </div>
  );
}
