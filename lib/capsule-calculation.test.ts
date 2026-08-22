import { describe, it, expect } from "vitest";
import { computeCalculation, weightKind } from "./capsule-calculation";

describe("computeCalculation", () => {
  it("BOTTLES_TO_KG: bottles -> capsules -> kg of powder", () => {
    // 1000 bottles * 31 capsules/bottle = 31,000 capsules * 372mg fill = 11,532,000mg = 11.532kg
    const result = computeCalculation("BOTTLES_TO_KG", 1000, 31, 372);
    expect(result.resultBottles).toBe(1000);
    expect(result.resultCapsules).toBe(31_000);
    expect(result.resultKg).toBeCloseTo(11.532, 6);
  });

  it("KG_TO_OUTPUT: blended powder kg -> capsules -> bottles", () => {
    // 11.532kg * 1,000,000 / 372mg fill = 31,000 capsules / 31 per bottle = 1000 bottles
    const result = computeCalculation("KG_TO_OUTPUT", 11.532, 31, 372);
    expect(result.resultKg).toBe(11.532);
    expect(result.resultCapsules).toBeCloseTo(31_000, 6);
    expect(result.resultBottles).toBeCloseTo(1000, 6);
  });

  it("BAGGED_KG_TO_OUTPUT: bagged capsule kg (full weight) -> capsules -> bottles, same math as KG_TO_OUTPUT with a different weight figure", () => {
    // 12kg of pressed capsules / 400mg full weight = 30,000 capsules / 31 per bottle
    const result = computeCalculation("BAGGED_KG_TO_OUTPUT", 12, 31, 400);
    expect(result.resultKg).toBe(12);
    expect(result.resultCapsules).toBeCloseTo(30_000, 6);
    expect(result.resultBottles).toBeCloseTo(30_000 / 31, 6);
  });

  it("KG_TO_OUTPUT and BAGGED_KG_TO_OUTPUT compute identically for the same kg/weight inputs -- they only differ in what the weight figure means, not the math", () => {
    const a = computeCalculation("KG_TO_OUTPUT", 5, 60, 500);
    const b = computeCalculation("BAGGED_KG_TO_OUTPUT", 5, 60, 500);
    expect(a).toEqual(b);
  });
});

describe("weightKind", () => {
  it("tags BOTTLES_TO_KG and KG_TO_OUTPUT as fill weight", () => {
    expect(weightKind("BOTTLES_TO_KG")).toBe("fill");
    expect(weightKind("KG_TO_OUTPUT")).toBe("fill");
  });

  it("tags BAGGED_KG_TO_OUTPUT as full weight", () => {
    expect(weightKind("BAGGED_KG_TO_OUTPUT")).toBe("full");
  });
});
