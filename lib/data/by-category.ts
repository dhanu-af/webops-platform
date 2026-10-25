import { db } from "@/lib/db";
import type { ChecklistCategory } from "@/app/generated/prisma/client";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone, todayLabelInTimeZone } from "@/lib/timezone";
import { scopeWhere, type UserScope } from "@/lib/scope";
import { scheduleAppliesOnDay } from "@/lib/schedule-recurrence";
import { isFacilityLevelCategory } from "@/lib/inspection-rules";
import { getTodayProductionDay } from "@/lib/production-calendar-data";

export async function getSchedulesByCategory(category: ChecklistCategory, scope: UserScope) {
  // No production today (weekend, holiday, blocked day): nothing is due. Facility checks such as the generator still are.
  if (!isFacilityLevelCategory(category) && !(await getTodayProductionDay()).production) return [];
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

// Every active checklist in a category, for "start any" (no schedule needed),
// plus the places it can be started for. The place a checklist is normally
// scheduled for is offered as the default.
export async function getOnDemandChecklists(category: ChecklistCategory, scope: UserScope = { scoped: false }) {
  const [checklists, areas] = await Promise.all([
    db.checklist.findMany({
      where: { category, active: true, versions: { some: { isCurrent: true } } },
      include: {
        schedules: { where: { active: true }, include: { area: true, section: true }, take: 1, orderBy: { createdAt: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    db.area.findMany({ where: { archived: false }, include: { section: true }, orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
  ]);

  return {
    // An operator assigned to specific areas is only offered those (the server enforces it too).
    areas: areas.filter((a) => !scope.scoped || scope.areaIds.includes(a.id)).map((a) => ({ id: a.id, label: `${a.section.name} / ${a.name}` })),
    checklists: checklists.map((c) => {
      const s = c.schedules[0];
      return {
        id: c.id,
        name: c.name,
        defaultAreaId: s?.areaId ?? null,
        group: s?.area?.name ?? s?.section?.name ?? "Facility-wide / other",
      };
    }),
  };
}
