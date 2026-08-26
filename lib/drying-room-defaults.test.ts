import { describe, it, expect } from "vitest";
import {
  computeBayStatus,
  computeBatchAlerts,
  computeBayAlerts,
  daysSinceProduction,
  NEXT_STAGE,
  STAGE_ACTIONS,
} from "./drying-room-defaults";

describe("NEXT_STAGE", () => {
  it("follows the linear pipeline", () => {
    expect(NEXT_STAGE.RECEIVING).toBe("DRYING");
    expect(NEXT_STAGE.WRAPPING).toBe("READY_FOR_POUCHING");
    expect(NEXT_STAGE.POUCHING).toBe("COMPLETE");
  });

  it("is terminal at COMPLETE", () => {
    expect(NEXT_STAGE.COMPLETE).toBeNull();
  });

  it("loops QC_HOLD back to QC_SAMPLING rather than continuing forward", () => {
    expect(NEXT_STAGE.QC_HOLD).toBe("QC_SAMPLING");
  });
});

describe("STAGE_ACTIONS", () => {
  it("branches from DRYING into rotation or QC, not a single linear action", () => {
    const actions = STAGE_ACTIONS.DRYING ?? [];
    expect(actions.map((a) => a.target)).toEqual(["ROTATION_REQUIRED", "QC_SAMPLING"]);
  });

  it("branches from QC_PENDING into pass or fail", () => {
    const actions = STAGE_ACTIONS.QC_PENDING ?? [];
    expect(actions.map((a) => a.target)).toEqual(["QC_APPROVED", "QC_HOLD"]);
  });

  it("has no actions from the terminal COMPLETE stage", () => {
    expect(STAGE_ACTIONS.COMPLETE).toBeUndefined();
  });
});

describe("computeBayStatus", () => {
  it("falls back to the bay's purpose when nothing active is in it", () => {
    expect(computeBayStatus("CLEANING_REQUIRED", [])).toBe("CLEANING_REQUIRED");
    expect(computeBayStatus("EMPTY", [])).toBe("EMPTY");
  });

  it("derives status from the single active batch's stage", () => {
    expect(computeBayStatus("EMPTY", [{ currentStage: "ROTATION_REQUIRED" }])).toBe("ROTATION_REQUIRED");
  });

  it("picks the most urgent status when multiple batches disagree", () => {
    // QUARANTINE isn't reachable via stage in this trimmed enum set, but
    // QC_HOLD must outrank WAITING_QC per the priority list.
    const status = computeBayStatus("EMPTY", [{ currentStage: "QC_SAMPLING" }, { currentStage: "QC_HOLD" }]);
    expect(status).toBe("QC_HOLD");
  });

  it("defaults to DRYING for a stage with no explicit bay-status mapping", () => {
    expect(computeBayStatus("EMPTY", [{ currentStage: "RECEIVING" }])).toBe("DRYING");
  });
});

describe("computeBatchAlerts", () => {
  const base = {
    productName: "Ashwagandha Extract",
    batchNumber: "B-100",
    stageUpdatedAt: new Date(),
    dryingStartTime: new Date(),
  };

  it("flags QC_SAMPLING/QC_PENDING as a warning-level QC Required alert", () => {
    const alerts = computeBatchAlerts({ ...base, currentStage: "QC_SAMPLING" });
    expect(alerts).toContainEqual(expect.objectContaining({ key: "qc-required", severity: "warning" }));
  });

  it("flags QC_HOLD as a danger-level alert", () => {
    const alerts = computeBatchAlerts({ ...base, currentStage: "QC_HOLD" });
    expect(alerts).toContainEqual(expect.objectContaining({ key: "qc-hold", severity: "danger" }));
  });

  it("does not flag rotation as overdue before the threshold", () => {
    const recent = new Date(Date.now() - 2 * 3_600_000);
    const alerts = computeBatchAlerts({ ...base, currentStage: "ROTATION_REQUIRED", stageUpdatedAt: recent });
    expect(alerts.some((a) => a.key === "rotation-overdue")).toBe(false);
  });

  it("flags rotation as overdue past ROTATION_OVERDUE_HOURS", () => {
    const stale = new Date(Date.now() - 13 * 3_600_000);
    const alerts = computeBatchAlerts({ ...base, currentStage: "ROTATION_REQUIRED", stageUpdatedAt: stale });
    expect(alerts).toContainEqual(expect.objectContaining({ key: "rotation-overdue", severity: "danger" }));
  });

  it("flags drying time exceeded past DRYING_TIME_EXCEEDED_HOURS, keyed off dryingStartTime not stageUpdatedAt", () => {
    const staleStart = new Date(Date.now() - 73 * 3_600_000);
    const alerts = computeBatchAlerts({ ...base, currentStage: "DRYING", dryingStartTime: staleStart, stageUpdatedAt: new Date() });
    expect(alerts).toContainEqual(expect.objectContaining({ key: "drying-exceeded", severity: "danger" }));
  });

  it("does not flag drying time exceeded when dryingStartTime hasn't been set yet", () => {
    const alerts = computeBatchAlerts({ ...base, currentStage: "DRYING", dryingStartTime: null, stageUpdatedAt: new Date() });
    expect(alerts.some((a) => a.key === "drying-exceeded")).toBe(false);
  });

  it("flags the catch-all waiting-too-long independently of other alerts", () => {
    const stale = new Date(Date.now() - 25 * 3_600_000);
    const alerts = computeBatchAlerts({ ...base, currentStage: "WRAPPING", stageUpdatedAt: stale });
    expect(alerts).toContainEqual(expect.objectContaining({ key: "waiting-too-long", severity: "warning" }));
  });

  it("never flags waiting-too-long for a COMPLETE batch", () => {
    const stale = new Date(Date.now() - 100 * 3_600_000);
    const alerts = computeBatchAlerts({ ...base, currentStage: "COMPLETE", stageUpdatedAt: stale });
    expect(alerts.some((a) => a.key === "waiting-too-long")).toBe(false);
  });
});

describe("computeBayAlerts", () => {
  it("flags a purpose that requires action", () => {
    const alerts = computeBayAlerts(3, "CLEANING_REQUIRED", []);
    expect(alerts).toContainEqual(expect.objectContaining({ key: "action-required", label: "Bay 3 — Cleaning Required" }));
  });

  it("flags an empty bay with nothing in it", () => {
    const alerts = computeBayAlerts(8, "EMPTY", []);
    expect(alerts).toContainEqual(expect.objectContaining({ key: "bay-empty", label: "Bay 8 — Empty" }));
  });

  it("does not flag an empty-purpose bay that actually has active batches", () => {
    const alerts = computeBayAlerts(8, "EMPTY", [{}]);
    expect(alerts.some((a) => a.key === "bay-empty")).toBe(false);
  });
});

describe("daysSinceProduction", () => {
  it("is 0 for a date entered today", () => {
    expect(daysSinceProduction(new Date())).toBe(0);
  });

  it("counts whole days elapsed", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000 - 1000);
    expect(daysSinceProduction(threeDaysAgo)).toBe(3);
  });

  it("never goes negative for a future date", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(daysSinceProduction(future)).toBe(0);
  });
});
