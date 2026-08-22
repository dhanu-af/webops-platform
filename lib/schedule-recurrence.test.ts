import { describe, it, expect } from "vitest";
import { scheduleAppliesOnDay } from "./schedule-recurrence";

// 2026-08-23 is a Sunday (day 0), 2026-08-24 is a Monday (day 1).
const SUNDAY = new Date("2026-08-23T00:00:00.000Z");
const MONDAY = new Date("2026-08-24T00:00:00.000Z");

function schedule(overrides: Partial<Parameters<typeof scheduleAppliesOnDay>[0]>) {
  return {
    frequency: "DAILY" as const,
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: null,
    recurrenceDays: [] as number[],
    ...overrides,
  };
}

describe("scheduleAppliesOnDay", () => {
  it("DAILY always applies once started", () => {
    expect(scheduleAppliesOnDay(schedule({ frequency: "DAILY" }), SUNDAY)).toBe(true);
    expect(scheduleAppliesOnDay(schedule({ frequency: "DAILY" }), MONDAY)).toBe(true);
  });

  it("WEEKLY only applies on its recurrenceDays, not every day", () => {
    // The reported bug: "Weekly 5S Audit" (Mondays only) was showing as
    // not-started on every day of the week, not just Monday.
    const weeklyMonday = schedule({ frequency: "WEEKLY", recurrenceDays: [1] });
    expect(scheduleAppliesOnDay(weeklyMonday, SUNDAY)).toBe(false);
    expect(scheduleAppliesOnDay(weeklyMonday, MONDAY)).toBe(true);
  });

  it("WEEKLY with empty recurrenceDays falls back to startDate's weekday", () => {
    // startDate 2026-08-24 is a Monday.
    const weeklyNoDaysSet = schedule({ frequency: "WEEKLY", startDate: new Date("2026-08-24T00:00:00.000Z") });
    expect(scheduleAppliesOnDay(weeklyNoDaysSet, SUNDAY)).toBe(false);
    expect(scheduleAppliesOnDay(weeklyNoDaysSet, MONDAY)).toBe(true);
  });

  it("MONTHLY only applies on its recurrenceDays (day-of-month)", () => {
    const monthlyOn23rd = schedule({ frequency: "MONTHLY", recurrenceDays: [23] });
    expect(scheduleAppliesOnDay(monthlyOn23rd, SUNDAY)).toBe(true);
    expect(scheduleAppliesOnDay(monthlyOn23rd, MONDAY)).toBe(false);
  });

  it("frequencies with no fixed calendar pattern (PER_SHIFT, AD_HOC, etc.) always apply once active", () => {
    expect(scheduleAppliesOnDay(schedule({ frequency: "PER_SHIFT" }), SUNDAY)).toBe(true);
    expect(scheduleAppliesOnDay(schedule({ frequency: "AD_HOC" }), MONDAY)).toBe(true);
  });

  it("never applies before startDate or after endDate", () => {
    const future = schedule({ startDate: new Date("2027-01-01T00:00:00.000Z") });
    expect(scheduleAppliesOnDay(future, SUNDAY)).toBe(false);

    const expired = schedule({ endDate: new Date("2026-08-01T00:00:00.000Z") });
    expect(scheduleAppliesOnDay(expired, SUNDAY)).toBe(false);
  });
});
