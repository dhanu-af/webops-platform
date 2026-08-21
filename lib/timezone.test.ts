import { describe, it, expect } from "vitest";
import { startOfDayInTimeZone, endOfDayInTimeZone, todayLabelInTimeZone } from "./timezone";

// Brisbane is a fixed UTC+10, no DST — makes it easy to hand-verify exact
// instants. This is the actual timezone this app's one real facility runs
// in ("please add correct QLD time" — the bug this file fixes: Vercel
// functions run in UTC, so "today" silently meant the UTC day, not the
// Brisbane day, for roughly the first 10-14 hours of every real day).
const BRISBANE = "Australia/Brisbane";

describe("startOfDayInTimeZone", () => {
  it("returns the UTC instant of Brisbane midnight (UTC 14:00 the previous day)", () => {
    // 2026-08-22 09:00 Brisbane = 2026-08-21 23:00 UTC — still the 21st in UTC,
    // already the 22nd in Brisbane. This is exactly the reported bug window.
    const duringBrisbaneMorning = new Date("2026-08-21T23:00:00.000Z");
    const start = startOfDayInTimeZone(BRISBANE, duringBrisbaneMorning);
    expect(start.toISOString()).toBe("2026-08-21T14:00:00.000Z");
  });

  it("stays on the same Brisbane day for a late-UTC instant that's already tomorrow locally", () => {
    // 2026-08-22 00:30 UTC = 2026-08-22 10:30 Brisbane — same Brisbane day either way.
    const at = new Date("2026-08-22T00:30:00.000Z");
    const start = startOfDayInTimeZone(BRISBANE, at);
    expect(start.toISOString()).toBe("2026-08-21T14:00:00.000Z");
  });
});

describe("endOfDayInTimeZone", () => {
  it("is exactly one day (minus 1ms) after start of day", () => {
    const at = new Date("2026-08-21T23:00:00.000Z");
    const start = startOfDayInTimeZone(BRISBANE, at);
    const end = endOfDayInTimeZone(BRISBANE, at);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });
});

describe("todayLabelInTimeZone", () => {
  it("reads the Brisbane calendar date, not the UTC one, encoded as a UTC-midnight label", () => {
    // 2026-08-21 23:00 UTC is already 2026-08-22 in Brisbane.
    const duringBrisbaneMorning = new Date("2026-08-21T23:00:00.000Z");
    const label = todayLabelInTimeZone(BRISBANE, duringBrisbaneMorning);
    expect(label.toISOString()).toBe("2026-08-22T00:00:00.000Z");
  });

  it("matches a UTC-midnight day label for the same Brisbane calendar day", () => {
    // The calendar month grid labels each day as UTC midnight for that
    // Y/M/D — todayLabelInTimeZone must line up with that exact encoding
    // for `===`/`<`/`>` comparisons against those labels to work at all.
    const gridDayLabel = new Date("2026-08-22T00:00:00.000Z");
    const at = new Date("2026-08-22T05:00:00.000Z"); // 2026-08-22 15:00 Brisbane
    expect(todayLabelInTimeZone(BRISBANE, at).getTime()).toBe(gridDayLabel.getTime());
  });
});
