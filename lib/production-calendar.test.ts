import { describe, expect, it } from "vitest";
import { dateKey, describeNoProduction, productionDayInfo, type ProductionCalendarConfig } from "./production-calendar";

// Labels are UTC-midnight stand-ins for facility-local calendar days.
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const base: ProductionCalendarConfig = { closedWeekdays: [0, 6], exceptions: [] };

describe("production days", () => {
  it("Monday to Friday are production days; Saturday and Sunday are not", () => {
    expect(productionDayInfo(day("2026-10-26"), base).production).toBe(true); // Monday
    expect(productionDayInfo(day("2026-10-30"), base).production).toBe(true); // Friday
    expect(productionDayInfo(day("2026-10-31"), base)).toMatchObject({ production: false, reason: "WEEKDAY_CLOSED" }); // Saturday
    expect(productionDayInfo(day("2026-11-01"), base)).toMatchObject({ production: false, reason: "WEEKDAY_CLOSED" }); // Sunday
  });

  it("a single Saturday can be opened without opening the others", () => {
    const config: ProductionCalendarConfig = { ...base, exceptions: [{ date: "2026-10-31", type: "OPEN", reason: "Rush order" }] };
    expect(productionDayInfo(day("2026-10-31"), config)).toMatchObject({ production: true, reason: "OPENED", note: "Rush order" });
    expect(productionDayInfo(day("2026-11-07"), config).production).toBe(false);
  });

  it("a normal weekday can be blocked (holiday)", () => {
    const config: ProductionCalendarConfig = { ...base, exceptions: [{ date: "2026-12-25", type: "BLOCKED", reason: "Christmas Day" }] };
    expect(productionDayInfo(day("2026-12-25"), config)).toMatchObject({ production: false, reason: "BLOCKED" });
    expect(productionDayInfo(day("2026-12-24"), config).production).toBe(true);
  });

  it("the weekly pattern is configurable", () => {
    expect(productionDayInfo(day("2026-10-31"), { closedWeekdays: [0], exceptions: [] }).production).toBe(true);
    expect(productionDayInfo(day("2026-10-28"), { closedWeekdays: [0, 3], exceptions: [] }).production).toBe(false); // Wednesday closed
  });

  it("describes a closed day in words", () => {
    expect(describeNoProduction(productionDayInfo(day("2026-11-01"), base))).toBe("Sunday - no production");
    const blocked = productionDayInfo(day("2026-12-25"), { ...base, exceptions: [{ date: "2026-12-25", type: "BLOCKED", reason: "Christmas Day" }] });
    expect(describeNoProduction(blocked)).toBe("No production - Christmas Day");
  });

  it("dateKey reads the label's own calendar day", () => {
    expect(dateKey(day("2026-10-26"))).toBe("2026-10-26");
  });
});
