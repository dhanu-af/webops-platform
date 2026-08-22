import { startOfDay, endOfDay } from "date-fns";
import type { Frequency } from "@/app/generated/prisma/client";

type RecurringSchedule = {
  frequency: Frequency;
  startDate: Date;
  endDate: Date | null;
  recurrenceDays: number[];
};

// A schedule "applies" on a given day if that day matches its recurrence
// rule and falls within its active date range. Empty recurrenceDays (never
// set at seed/creation time) falls back to the single day implied by
// startDate, rather than silently applying every day/date.
//
// DAILY and every event/shift-triggered frequency (PER_SHIFT, AD_HOC,
// QUARTERLY, BEFORE_PRODUCTION, AFTER_PRODUCTION, AFTER_CLEANING,
// AFTER_MAINTENANCE) has no fixed calendar pattern to check against, so
// they always apply once active — only WEEKLY/MONTHLY have an actual
// recurring calendar rule to test.
export function scheduleAppliesOnDay(schedule: RecurringSchedule, day: Date): boolean {
  if (day < startOfDay(schedule.startDate)) return false;
  if (schedule.endDate && day > endOfDay(schedule.endDate)) return false;

  if (schedule.frequency === "WEEKLY") {
    const days = schedule.recurrenceDays.length ? schedule.recurrenceDays : [schedule.startDate.getDay()];
    return days.includes(day.getUTCDay());
  }

  if (schedule.frequency === "MONTHLY") {
    const days = schedule.recurrenceDays.length ? schedule.recurrenceDays : [schedule.startDate.getDate()];
    return days.includes(day.getUTCDate());
  }

  return true;
}
