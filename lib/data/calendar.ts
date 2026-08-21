import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone, todayLabelInTimeZone } from "@/lib/timezone";
import type { Frequency } from "@/app/generated/prisma/client";

// Only these three frequencies map onto a predictable calendar day — the
// others (PER_SHIFT, AD_HOC, BEFORE/AFTER_PRODUCTION, AFTER_CLEANING,
// AFTER_MAINTENANCE, QUARTERLY) are event- or shift-triggered and don't have
// a fixed date to plot, so they're deliberately excluded from the grid.
const CALENDAR_FREQUENCIES: Frequency[] = ["DAILY", "WEEKLY", "MONTHLY"];

export type CalendarSchedule = Awaited<ReturnType<typeof getCalendarSchedules>>[number];

async function getCalendarSchedules(filters: { areaId?: string; frequency?: string }) {
  return db.checklistSchedule.findMany({
    where: {
      active: true,
      frequency: filters.frequency ? (filters.frequency as Frequency) : { in: CALENDAR_FREQUENCIES },
      areaId: filters.areaId || undefined,
    },
    include: { checklist: true, area: true, section: true, facility: true },
    orderBy: { dueTime: "asc" },
  });
}

// A schedule "applies" on a given day if that day matches its recurrence
// rule and falls within its active date range. Empty recurrenceDays (never
// set at seed/creation time) falls back to the single day implied by
// startDate, rather than silently applying every day/date.
function scheduleAppliesOnDay(schedule: CalendarSchedule, day: Date): boolean {
  if (day < startOfDay(schedule.startDate)) return false;
  if (schedule.endDate && day > endOfDay(schedule.endDate)) return false;

  if (schedule.frequency === "DAILY") return true;

  if (schedule.frequency === "WEEKLY") {
    const days = schedule.recurrenceDays.length ? schedule.recurrenceDays : [schedule.startDate.getDay()];
    return days.includes(day.getDay());
  }

  if (schedule.frequency === "MONTHLY") {
    const days = schedule.recurrenceDays.length ? schedule.recurrenceDays : [schedule.startDate.getDate()];
    return days.includes(day.getDate());
  }

  return false;
}

export type CalendarEntry = {
  scheduleId: string;
  checklistName: string;
  areaName: string | null;
  frequency: Frequency;
  dueTime: string | null;
  inspectionId: string | null;
  status: "SCHEDULED" | "DUE" | "OVERDUE" | "NOT_STARTED" | "IN_PROGRESS" | "AWAITING_SUPERVISOR" | "AWAITING_QA" | "RETURNED" | "REJECTED" | "CLOSED";
};

export async function getCalendarMonth(monthDate: Date, filters: { areaId?: string; frequency?: string } = {}) {
  const from = startOfMonth(monthDate);
  const to = endOfMonth(monthDate);
  const timeZone = await getFacilityTimezone();
  // A UTC-midnight "label" matching how `day` below is generated (plain
  // Date math, one label per calendar day of the month) — not a real DB-
  // range instant, so it must use the same labeling convention as `day`,
  // not the real Brisbane-midnight instant startOfDayInTimeZone returns.
  const today = todayLabelInTimeZone(timeZone);

  const schedules = await getCalendarSchedules(filters);

  const inspections = await db.inspection.findMany({
    where: {
      scheduleId: { in: schedules.map((s) => s.id) },
      // Brisbane's real day boundaries sit ahead of UTC's, so a plain
      // endOfDay(to) can cut off real inspections created (in UTC terms)
      // on the day after `to` that were still within Brisbane's `to` —
      // widen the outer bound to match, the per-day isWithinInterval
      // check below does the real precise matching either way.
      createdAt: { gte: from, lte: endOfDayInTimeZone(timeZone, to) },
    },
    select: { id: true, scheduleId: true, status: true, createdAt: true },
  });

  const days: { date: Date; entries: CalendarEntry[] }[] = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const entries: CalendarEntry[] = [];
    for (const schedule of schedules) {
      if (!scheduleAppliesOnDay(schedule, day)) continue;
      const inspection = inspections.find(
        (i) =>
          i.scheduleId === schedule.id &&
          isWithinInterval(i.createdAt, { start: startOfDayInTimeZone(timeZone, day), end: endOfDayInTimeZone(timeZone, day) })
      );
      const status: CalendarEntry["status"] = inspection
        ? (inspection.status as CalendarEntry["status"])
        : day < today
          ? "OVERDUE"
          : day.getTime() === today.getTime()
            ? "DUE"
            : "SCHEDULED";
      entries.push({
        scheduleId: schedule.id,
        checklistName: schedule.checklist.name,
        areaName: schedule.area?.name ?? schedule.section?.name ?? schedule.facility.name,
        frequency: schedule.frequency,
        dueTime: schedule.dueTime,
        inspectionId: inspection?.id ?? null,
        status,
      });
    }
    days.push({ date: day, entries });
  }

  return { days, from, to };
}

export async function getCalendarAreaOptions() {
  return db.area.findMany({ where: { archived: false }, include: { section: true }, orderBy: { name: "asc" } });
}
