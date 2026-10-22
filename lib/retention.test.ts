import { describe, expect, it } from "vitest";
import { MIN_RETENTION_YEARS, retainUntil, validateRetentionYears } from "@/lib/retention";

describe("URS-16 retention policy", () => {
  it("never allows fewer than 3 years", () => {
    expect(MIN_RETENTION_YEARS).toBe(3);
    expect(validateRetentionYears(2)).toMatch(/at least 3/);
    expect(validateRetentionYears(0)).not.toBeNull();
    expect(validateRetentionYears(-5)).not.toBeNull();
  });
  it("accepts 3 or more whole years", () => {
    expect(validateRetentionYears(3)).toBeNull();
    expect(validateRetentionYears(7)).toBeNull();
  });
  it("rejects non-integers and non-numbers", () => {
    expect(validateRetentionYears(3.5)).not.toBeNull();
    expect(validateRetentionYears("5")).not.toBeNull();
    expect(validateRetentionYears(Number.NaN)).not.toBeNull();
  });
  it("computes the earliest disposal date", () => {
    expect(retainUntil(new Date("2026-10-23T00:00:00Z"), 3).toISOString()).toBe("2029-10-23T00:00:00.000Z");
  });
});
