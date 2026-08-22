import { db } from "@/lib/db";
import type { ChecklistCategory } from "@/app/generated/prisma/client";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone } from "@/lib/timezone";
import { scopeWhere, type UserScope } from "@/lib/scope";

export async function getSchedulesByCategory(category: ChecklistCategory, scope: UserScope) {
  const now = new Date();
  const timeZone = await getFacilityTimezone();
  return db.checklistSchedule.findMany({
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
}
