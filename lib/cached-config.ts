import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

// Settings and the facility timezone are read on every page but change a few
// times a year, so they are kept for up to 5 minutes instead of being fetched
// on each navigation. The actions that change them call updateTag() with the
// tags below, so an admin sees their own change immediately.
export const SETTINGS_TAG = "system-settings";
export const FACILITY_TAG = "facility-config";

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
