import type { DryingBayPurpose, DryingStage } from "@/app/generated/prisma/client";

/// Whole days elapsed since the batch entered the drying room -- shown on every batch line.
export function daysSinceProduction(dateEnteredDryingRoom: Date | string): number {
  const ms = Date.now() - new Date(dateEnteredDryingRoom).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export const PRIORITY_LABEL: Record<number, string> = { 1: "1st Priority", 2: "2nd Priority", 3: "3rd Priority" };
export const PRIORITY_BADGE: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export const PURPOSE_LABEL: Record<DryingBayPurpose, string> = {
  EMPTY: "Empty",
  DRYING: "Drying",
  WAITING_QC: "Waiting QC",
  READY_FOR_POUCHING: "Ready for Pouching",
  READY_FOR_PRODUCTION: "Ready for Production",
  CLEANING_REQUIRED: "Cleaning Required",
  RND: "R&D",
  STORAGE: "Storage",
  SERVICE: "Service",
  QUARANTINE: "Quarantine",
};

export const STAGE_LABEL: Record<DryingStage, string> = {
  RECEIVING: "Receiving",
  DRYING: "Drying",
  ROTATION_REQUIRED: "Rotation Required",
  CONTINUE_DRYING: "Continue Drying",
  QC_SAMPLING: "QC Sampling",
  QC_PENDING: "QC Pending",
  QC_APPROVED: "QC Approved",
  QC_HOLD: "QC Hold",
  WRAPPING: "Wrapping",
  READY_FOR_POUCHING: "Ready for Pouching",
  POUCHING: "Pouching",
  COMPLETE: "Complete",
};

/// Stage -> next stage. Null = terminal (Complete). QC_HOLD loops back to
/// QC_SAMPLING rather than continuing forward -- a failed QC means resample,
/// not "proceed anyway".
export const NEXT_STAGE: Record<DryingStage, DryingStage | null> = {
  RECEIVING: "DRYING",
  DRYING: "ROTATION_REQUIRED",
  ROTATION_REQUIRED: "CONTINUE_DRYING",
  CONTINUE_DRYING: "QC_SAMPLING",
  QC_SAMPLING: "QC_PENDING",
  QC_PENDING: "QC_APPROVED",
  QC_APPROVED: "WRAPPING",
  QC_HOLD: "QC_SAMPLING",
  WRAPPING: "READY_FOR_POUCHING",
  READY_FOR_POUCHING: "POUCHING",
  POUCHING: "COMPLETE",
  COMPLETE: null,
};

/// Bay status colour bucket -- what's actually shown on a bay tile.
export type BayStatusKey =
  | "EMPTY"
  | "DRYING"
  | "ROTATION_REQUIRED"
  | "WAITING_QC"
  | "WRAPPED"
  | "READY_FOR_POUCHING"
  | "READY_FOR_PRODUCTION"
  | "CLEANING_REQUIRED"
  | "QC_HOLD"
  | "SERVICE"
  | "RND"
  | "QUARANTINE";

export const BAY_STATUS_LABEL: Record<BayStatusKey, string> = {
  EMPTY: "Empty",
  DRYING: "Drying",
  ROTATION_REQUIRED: "Rotation Required",
  WAITING_QC: "Waiting QC",
  WRAPPED: "Wrapped",
  READY_FOR_POUCHING: "Ready for Pouching",
  READY_FOR_PRODUCTION: "Ready for Production",
  CLEANING_REQUIRED: "Cleaning Required",
  QC_HOLD: "QC Hold",
  SERVICE: "Service",
  RND: "R&D",
  QUARANTINE: "Quarantine",
};

export const BAY_STATUS_CLASS: Record<BayStatusKey, string> = {
  EMPTY: "bg-surface-sunken text-muted border-border",
  DRYING: "bg-status-warn-soft text-status-warn border-status-warn/30",
  ROTATION_REQUIRED: "bg-status-attention-soft text-status-attention border-status-attention/30",
  WAITING_QC: "bg-accent-soft text-accent-strong border-accent/30",
  WRAPPED: "bg-accent-soft text-accent-strong border-accent/30",
  READY_FOR_POUCHING: "bg-status-pass-soft text-status-pass border-status-pass/30",
  READY_FOR_PRODUCTION: "bg-status-pass-soft text-status-pass border-status-pass/30",
  CLEANING_REQUIRED: "bg-status-warn-soft text-status-warn border-status-warn/30",
  QC_HOLD: "bg-status-critical-soft text-status-critical border-status-critical/30",
  SERVICE: "bg-surface-sunken text-muted border-border",
  RND: "bg-accent-soft text-accent-strong border-accent/30",
  QUARANTINE: "bg-status-critical-soft text-status-critical border-status-critical/30",
};

const STAGE_TO_BAY_STATUS: Partial<Record<DryingStage, BayStatusKey>> = {
  ROTATION_REQUIRED: "ROTATION_REQUIRED",
  QC_SAMPLING: "WAITING_QC",
  QC_PENDING: "WAITING_QC",
  QC_HOLD: "QC_HOLD",
  WRAPPING: "WRAPPED",
  READY_FOR_POUCHING: "READY_FOR_POUCHING",
};

const PURPOSE_TO_BAY_STATUS: Record<DryingBayPurpose, BayStatusKey> = {
  EMPTY: "EMPTY",
  DRYING: "DRYING",
  WAITING_QC: "WAITING_QC",
  READY_FOR_POUCHING: "READY_FOR_POUCHING",
  READY_FOR_PRODUCTION: "READY_FOR_PRODUCTION",
  CLEANING_REQUIRED: "CLEANING_REQUIRED",
  RND: "RND",
  STORAGE: "SERVICE",
  SERVICE: "SERVICE",
  QUARANTINE: "QUARANTINE",
};

/// Named quick-action buttons valid from each stage -- richer than NEXT_STAGE
/// alone since some stages branch (DRYING can go to rotation OR straight to
/// QC; QC_PENDING can pass or fail).
export const STAGE_ACTIONS: Partial<Record<DryingStage, { label: string; target: DryingStage }[]>> = {
  RECEIVING: [{ label: "Start Drying", target: "DRYING" }],
  DRYING: [
    { label: "Rotation Required", target: "ROTATION_REQUIRED" },
    { label: "Request QC", target: "QC_SAMPLING" },
  ],
  ROTATION_REQUIRED: [{ label: "Rotation Completed", target: "CONTINUE_DRYING" }],
  CONTINUE_DRYING: [{ label: "Request QC", target: "QC_SAMPLING" }],
  QC_SAMPLING: [{ label: "Move to QC Pending", target: "QC_PENDING" }],
  QC_PENDING: [
    { label: "QC Passed", target: "QC_APPROVED" },
    { label: "QC Failed", target: "QC_HOLD" },
  ],
  QC_HOLD: [{ label: "Resample", target: "QC_SAMPLING" }],
  QC_APPROVED: [{ label: "Wrapped", target: "WRAPPING" }],
  WRAPPING: [{ label: "Ready for Pouching", target: "READY_FOR_POUCHING" }],
  READY_FOR_POUCHING: [{ label: "Send to Pouching", target: "POUCHING" }],
  POUCHING: [{ label: "Mark Complete", target: "COMPLETE" }],
};

type BatchLike = { currentStage: DryingStage };

/// Bay's current status is driven by its most urgent active batch, falling
/// back to its manually-set purpose when empty -- a bay never gets its own
/// independent status that can drift from what's actually in it.
export function computeBayStatus(purpose: DryingBayPurpose, activeBatches: BatchLike[]): BayStatusKey {
  if (activeBatches.length === 0) return PURPOSE_TO_BAY_STATUS[purpose];

  const priority: BayStatusKey[] = ["QUARANTINE", "QC_HOLD", "ROTATION_REQUIRED", "WAITING_QC", "READY_FOR_POUCHING", "WRAPPED"];
  const statuses = activeBatches.map((b) => STAGE_TO_BAY_STATUS[b.currentStage] ?? "DRYING");
  for (const p of priority) {
    if (statuses.includes(p)) return p;
  }
  return statuses[0] ?? "DRYING";
}

// Alert thresholds (hours) -- tune here as real-world drying/QC timings become clear.
export const ROTATION_OVERDUE_HOURS = 12;
export const DRYING_TIME_EXCEEDED_HOURS = 72;
export const BATCH_WAITING_TOO_LONG_HOURS = 24;

export type DryingAlert = {
  key: string;
  label: string;
  severity: "warning" | "danger";
};

function hoursSince(d: Date | string): number {
  return (Date.now() - new Date(d).getTime()) / 3_600_000;
}

/// Pure, read-only alerts derived from current state -- nothing here is stored.
export function computeBatchAlerts(batch: {
  productName: string;
  batchNumber: string;
  currentStage: DryingStage;
  stageUpdatedAt: Date | string;
  dryingStartTime: Date | string | null;
}): DryingAlert[] {
  const alerts: DryingAlert[] = [];
  const label = `${batch.productName} · ${batch.batchNumber}`;

  if (batch.currentStage === "QC_SAMPLING" || batch.currentStage === "QC_PENDING") {
    alerts.push({ key: "qc-required", label: `${label} — QC Required`, severity: "warning" });
  }
  if (batch.currentStage === "QC_HOLD") {
    alerts.push({ key: "qc-hold", label: `${label} — QC Hold`, severity: "danger" });
  }
  if (batch.currentStage === "ROTATION_REQUIRED" && hoursSince(batch.stageUpdatedAt) > ROTATION_OVERDUE_HOURS) {
    alerts.push({ key: "rotation-overdue", label: `${label} — Rotation Overdue`, severity: "danger" });
  }
  if (batch.dryingStartTime && (batch.currentStage === "DRYING" || batch.currentStage === "CONTINUE_DRYING")) {
    if (hoursSince(batch.dryingStartTime) > DRYING_TIME_EXCEEDED_HOURS) {
      alerts.push({ key: "drying-exceeded", label: `${label} — Drying Time Exceeded`, severity: "danger" });
    }
  }
  if (batch.currentStage === "READY_FOR_POUCHING") {
    alerts.push({ key: "ready-for-pouching", label: `${label} — Ready for Pouching`, severity: "warning" });
  }
  if (hoursSince(batch.stageUpdatedAt) > BATCH_WAITING_TOO_LONG_HOURS && batch.currentStage !== "COMPLETE") {
    alerts.push({ key: "waiting-too-long", label: `${label} — Waiting Too Long in ${STAGE_LABEL[batch.currentStage]}`, severity: "warning" });
  }
  return alerts;
}

const PURPOSE_REQUIRES_ACTION: Partial<Record<DryingBayPurpose, string>> = {
  CLEANING_REQUIRED: "Cleaning Required",
};

export function computeBayAlerts(bayNumber: number, purpose: DryingBayPurpose, activeBatches: unknown[]): DryingAlert[] {
  const alerts: DryingAlert[] = [];
  const requiredLabel = PURPOSE_REQUIRES_ACTION[purpose];
  if (requiredLabel) {
    alerts.push({ key: "action-required", label: `Bay ${bayNumber} — ${requiredLabel}`, severity: "warning" });
  }
  if (purpose === "EMPTY" && activeBatches.length === 0) {
    alerts.push({ key: "bay-empty", label: `Bay ${bayNumber} — Empty`, severity: "warning" });
  }
  return alerts;
}
