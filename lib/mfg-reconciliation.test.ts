import { describe, it, expect } from "vitest";
import { computeBalance, computeYieldPct, capsulesFromKg, checkRange, checkBelow, computeFinalReconciliationChecks } from "./mfg-reconciliation";

describe("computeBalance", () => {
  it("is issued minus returned", () => {
    expect(computeBalance(100, 20)).toBe(80);
  });

  it("treats missing returned as zero", () => {
    expect(computeBalance(100, null)).toBe(100);
  });

  it("is null when issued is missing", () => {
    expect(computeBalance(null, 20)).toBeNull();
  });
});

describe("computeYieldPct", () => {
  it("is actual / expected * 100", () => {
    expect(computeYieldPct(95, 100)).toBe(95);
  });

  it("is null when expected is zero (avoids divide-by-zero)", () => {
    expect(computeYieldPct(95, 0)).toBeNull();
  });

  it("is null when either side is missing", () => {
    expect(computeYieldPct(null, 100)).toBeNull();
    expect(computeYieldPct(95, null)).toBeNull();
  });
});

describe("capsulesFromKg", () => {
  it("converts kg to capsule count via avg weight in mg", () => {
    // 1kg = 1,000,000mg / 400mg per capsule = 2500 capsules
    expect(capsulesFromKg(1, 400)).toBe(2500);
  });

  it("is null when avg weight is zero or missing", () => {
    expect(capsulesFromKg(1, 0)).toBeNull();
    expect(capsulesFromKg(1, null)).toBeNull();
    expect(capsulesFromKg(null, 400)).toBeNull();
  });
});

describe("checkRange / checkBelow", () => {
  it("checkRange passes inside the inclusive range", () => {
    expect(checkRange("X", 98, 98, 102).pass).toBe(true);
    expect(checkRange("X", 102, 98, 102).pass).toBe(true);
    expect(checkRange("X", 100, 98, 102).pass).toBe(true);
  });

  it("checkRange fails outside the range", () => {
    expect(checkRange("X", 97.9, 98, 102).pass).toBe(false);
    expect(checkRange("X", 102.1, 98, 102).pass).toBe(false);
  });

  it("checkBelow passes at or under the max", () => {
    expect(checkBelow("X", 1.5, 1.5).pass).toBe(true);
    expect(checkBelow("X", 1.4, 1.5).pass).toBe(true);
    expect(checkBelow("X", 1.6, 1.5).pass).toBe(false);
  });

  it("pass is null (not true/false) when pct itself is null -- a missing input, not a failed check", () => {
    expect(checkRange("X", null, 98, 102).pass).toBeNull();
    expect(checkBelow("X", null, 1.5).pass).toBeNull();
  });
});

describe("computeFinalReconciliationChecks", () => {
  it("returns nothing for a batch with no completed stages", () => {
    expect(computeFinalReconciliationChecks(null, null, null)).toEqual([]);
  });

  it("includes a Blend Yield check (informational, no pass/fail) when blending data exists", () => {
    const checks = computeFinalReconciliationChecks({ totalBlendProducedKg: 95, totalTheoreticalWeightKg: 100 }, null, null);
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({ label: "Blending — Blend Yield", pct: 95, pass: null });
  });

  it("computes all 4 encapsulation checks and passes them for a clean reconciled batch", () => {
    // 1kg issued at 400mg fill -> 2500 theoretical capsules.
    // Produced 0.99kg + samples 0.005kg + rejects 0.005kg at 450mg full weight
    // covers 2200+11.11+11.11 = 2222.22 capsules -- accounted-for math below
    // is easier to reason about with round numbers, so use those instead.
    const checks = computeFinalReconciliationChecks(
      null,
      {
        issuedBulkBlendKg: 1,
        targetCapsuleFillWeightMg: 400,
        capsulesProducedKg: 1.125,
        avgCapsuleFullWeightMg: 450,
        avgCapsuleFillWeightMg: 400,
        capsuleSamplesKg: 0,
        rejectCapsulesKg: 0,
        rejectPowderKg: 0,
      },
      null
    );
    // theoreticalCapsules = 1,000,000/400 = 2500
    // capsulesProduced = 1,125,000/450 = 2500 -- exact match, every check should pass
    expect(checks).toHaveLength(4);
    for (const c of checks) expect(c.pass).toBe(true);
  });

  it("fails the Capsule Rejection check when rejects exceed the 1.5% ceiling", () => {
    const checks = computeFinalReconciliationChecks(
      null,
      {
        issuedBulkBlendKg: 1,
        targetCapsuleFillWeightMg: 400,
        capsulesProducedKg: 0.9,
        avgCapsuleFullWeightMg: 450,
        avgCapsuleFillWeightMg: 400,
        capsuleSamplesKg: 0,
        rejectCapsulesKg: 0.09, // a large reject fraction relative to produced
        rejectPowderKg: 0,
      },
      null
    );
    const rejectionCheck = checks.find((c) => c.label === "Encapsulation — Capsule Rejection");
    expect(rejectionCheck?.pass).toBe(false);
  });

  it("computes all 5 bottling checks", () => {
    const checks = computeFinalReconciliationChecks(null, null, {
      capsuleReceivedKg: 1,
      avgCapsuleFullWeightMg: 400,
      targetCapsulesPerBottle: 25,
      bottlesProduced: 100,
      capsUsed: 100,
      bottleUsed: 100,
    });
    // theoreticalCapsules = 1,000,000/400 = 2500; capsulesUsed = 100*25 = 2500 -- exact match
    expect(checks).toHaveLength(5);
    for (const c of checks) expect(c.pass).toBe(true);
  });

  it("combines checks from all three stages when all are present", () => {
    const checks = computeFinalReconciliationChecks(
      { totalBlendProducedKg: 95, totalTheoreticalWeightKg: 100 },
      {
        issuedBulkBlendKg: 1,
        targetCapsuleFillWeightMg: 400,
        capsulesProducedKg: 1.125,
        avgCapsuleFullWeightMg: 450,
        avgCapsuleFillWeightMg: 400,
        capsuleSamplesKg: 0,
        rejectCapsulesKg: 0,
        rejectPowderKg: 0,
      },
      { capsuleReceivedKg: 1, avgCapsuleFullWeightMg: 400, targetCapsulesPerBottle: 25, bottlesProduced: 100, capsUsed: 100, bottleUsed: 100 }
    );
    expect(checks).toHaveLength(1 + 4 + 5);
  });
});
