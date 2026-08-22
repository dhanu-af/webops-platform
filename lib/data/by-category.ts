import { db } from "@/lib/db";
import type { ChecklistCategory } from "@/app/generated/prisma/client";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone, todayLabelInTimeZone } from "@/lib/timezone";
import { scopeWhere, type UserScope } from "@/lib/scope";
import { scheduleAppliesOnDay } from "@/lib/schedule-recurrence";

export async function getSchedulesByCategory(category: ChecklistCategory, scope: UserScope) {
  const now = new Date();
  const timeZone = await getFacilityTimezone();
  const today = todayLabelInTimeZone(timeZone, now);
  const schedules = await db.checklistSchedule.findMany({
    where: { active: true, startDate: { lte: now }, checklist: { category }, ...scopeWhere(scope) },
    include: {
      checklist: true,
      facility: true,
      section: true,
      area: true,
      equipment: true,
      inspections: { where: { createdAt: { gte: startOfDayInTimeZone(timeZone, now), lte: endOfDayInTimeZone(timeZone, now) } }, take: 1 },
    },
    orderBy: [{ dueTime: "asc" }],
  });

  // Without this, a WEEKLY/MONTHLY schedule (e.g. "Weekly 5S Audit") showed
  // up here — and read as freshly "not started" — on every single day, not
  // just its actual recurrence day, since the `inspections` filter above
  // only ever looks for one created *today* and every other day naturally
  // has none. Matches the exact recurrence rule the Calendar page already
  // uses to decide which days a schedule is really due on.
  return schedules.filter((s) => scheduleAppliesOnDay(s, today));
}
