import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

// Settings and the facility timezone are read on every page but change a few
// times a year, so they are kept for up to 5 minutes instead of being fetched
// on each navigation. The actions that change them call updateTag() with the
// tags below, so an admin sees their own change immediately.
export const SETTINGS_TAG = "system-settings";
export const FACILITY_TAG = "facility-config";
export const PRODUCTION_CALENDAR_TAG = "production-calendar";

export const getCachedRetentionYears = unstable_cache(
  async () => (await db.systemSettings.findFirst({ select: { retentionYears: true } }))?.retentionYears ?? 3,
  ["retention-years"],
  { tags: [SETTINGS_TAG], revalidate: 300 }
);

export const getCachedFacilityTimezone = unstable_cache(
  async () => (await db.facility.findFirst({ where: { archived: false }, select: { timezone: true } }))?.timezone ?? null,
  ["facility-timezone"],
  { tags: [FACILITY_TAG], revalidate: 300 }
);

// Closed weekdays + single-date exceptions: read on Today's Ops, the checklist pages and every start.
// Cleared at once by the production-calendar actions.
export const getCachedProductionCalendar = unstable_cache(
  async () => {
    const [settings, exceptions] = await Promise.all([
      db.systemSettings.findFirst({ select: { closedWeekdays: true } }),
      db.productionDayException.findMany({ orderBy: { date: "asc" } }),
    ]);
    return {
      closedWeekdays: settings?.closedWeekdays ?? [0, 6],
      exceptions: exceptions.map((e) => ({ id: e.id, date: e.date.toISOString().slice(0, 10), type: e.type, reason: e.reason })),
    };
  },
  ["production-calendar"],
  { tags: [PRODUCTION_CALENDAR_TAG], revalidate: 300 }
);
