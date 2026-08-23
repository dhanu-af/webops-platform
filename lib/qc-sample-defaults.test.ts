import { describe, it, expect } from "vitest";
import { formatSampleId, daysUntil, timeUntilExpiryLabel } from "./qc-sample-defaults";

describe("formatSampleId", () => {
  it("combines the creation year with the zero-padded sequence", () => {
    expect(formatSampleId(124, new Date(2026, 0, 1))).toBe("QC-2026-000124");
  });

  it("pads to 6 digits regardless of sequence size", () => {
    expect(formatSampleId(1, new Date(2026, 0, 1))).toBe("QC-2026-000001");
    expect(formatSampleId(1234567, new Date(2026, 0, 1))).toBe("QC-2026-1234567");
  });

  it("defaults to the current date when none is given", () => {
    expect(formatSampleId(5)).toBe(`QC-${new Date().getFullYear()}-000005`);
  });
});

describe("daysUntil", () => {
  it("is null when there's no date", () => {
    expect(daysUntil(null)).toBeNull();
  });

  it("is positive for a future date", () => {
    const future = new Date(Date.now() + 5 * 86_400_000);
    expect(daysUntil(future)).toBeGreaterThanOrEqual(4);
  });

  it("is negative for a past date", () => {
    const past = new Date(Date.now() - 5 * 86_400_000);
    expect(daysUntil(past)).toBeLessThanOrEqual(-4);
  });
});

describe("timeUntilExpiryLabel", () => {
  it("is an em-dash when there's no date", () => {
    expect(timeUntilExpiryLabel(null)).toBe("—");
  });

  it("phrases a future date as time left", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(timeUntilExpiryLabel(future)).toMatch(/left$/);
    expect(timeUntilExpiryLabel(future)).toMatch(/^\d+ days? left$/);
  });

  it("phrases a past date as expired ... ago", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    expect(timeUntilExpiryLabel(past)).toMatch(/^Expired .+ ago$/);
  });

  it("pluralizes units correctly for exactly one day", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(timeUntilExpiryLabel(tomorrow)).toBe("1 day left");
  });

  it("combines years, months, and days for a distant future date", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    future.setMonth(future.getMonth() + 2);
    future.setDate(future.getDate() + 5);
    expect(timeUntilExpiryLabel(future)).toBe("1 year, 2 months, 5 days left");
  });
});
