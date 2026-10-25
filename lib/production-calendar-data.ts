import { getCachedProductionCalendar } from "@/lib/cached-config";
import { getFacilityTimezone, todayLabelInTimeZone } from "@/lib/timezone";
import { isFacilityLevelCategory } from "@/lib/inspection-rules";
import { describeNoProduction, productionDayInfo, type ProductionDay } from "@/lib/production-calendar";
import { UserFacingError } from "@/lib/user-error";

export async function getProductionCalendarConfig() {
  return getCachedProductionCalendar();
}

/** Whether today (facility-local) is a production day. */
export async function getTodayProductionDay(): Promise<ProductionDay> {
  const [config, timeZone] = await Promise.all([getCachedProductionCalendar(), getFacilityTimezone()]);
  return productionDayInfo(todayLabelInTimeZone(timeZone), config);
}

/**
 * Starting a production check on a closed day is refused, with the way out spelled out.
 * Facility-level checks (generator, utilities) are not production and are never blocked.
 */
export async function assertProductionDayToStart(category: string | undefined) {
  if (category && isFacilityLevelCategory(category)) return;
  const today = await getTodayProductionDay();
  if (!today.production) {
    throw new UserFacingError(`${describeNoProduction(today)} today. If work is going ahead, ask an admin to open today in Settings > Production calendar.`);
  }
}
