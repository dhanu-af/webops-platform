import { db } from "@/lib/db";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone, todayLabelInTimeZone } from "@/lib/timezone";
import { scopeWhere, type UserScope } from "@/lib/scope";
import { scheduleAppliesOnDay } from "@/lib/schedule-recurrence";

export async function getTodaySchedules(scope: UserScope) {
  const now = new Date();
  const timeZone = await getFacilityTimezone();
  const today = todayLabelInTimeZone(timeZone, now);
  const schedules = await db.checklistSchedule.findMany({
    where: { active: true, startDate: { lte: now }, ...scopeWhere(scope) },
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

  // Same recurrence-day fix as getSchedulesByCategory (lib/data/by-category.ts)
  // -- without it a WEEKLY/MONTHLY schedule shows as freshly "not started"
  // every day instead of only on its actual due day.
  return schedules.filter((s) => scheduleAppliesOnDay(s, today));
}

export async function listInspections(
  filters: {
    status?: string;
    sectionId?: string;
    areaId?: string;
    frequency?: string;
    q?: string;
  } = {},
  scope: UserScope = { scoped: false }
) {
  return db.inspection.findMany({
    where: {
      status: filters.status ? (filters.status as never) : undefined,
      sectionId: filters.sectionId || undefined,
      areaId: filters.areaId || undefined,
      frequency: filters.frequency ? (filters.frequency as never) : undefined,
      checklistVersion: filters.q ? { checklist: { name: { contains: filters.q, mode: "insensitive" } } } : undefined,
      ...scopeWhere(scope),
    },
    include: {
      checklistVersion: { include: { checklist: true } },
      area: true,
      section: true,
      operator: true,
      supervisor: true,
      qa: true,
      findings: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listCorrectiveActions(filters: { status?: string; areaId?: string } = {}, scope: UserScope = { scoped: false }) {
  // CorrectiveAction only ever has a specific areaId (no section/facility-wide
  // variant), so an exact match is the whole scope rule here - no hierarchy.
  return db.correctiveAction.findMany({
    where: {
      status: filters.status ? (filters.status as never) : undefined,
      areaId: scope.scoped ? scope.areaId : filters.areaId || undefined,
    },
    include: {
      finding: { include: { inspection: { include: { checklistVersion: { include: { checklist: true } } } } } },
      area: true,
      equipment: true,
      responsibleUser: true,
    },
    orderBy: { dueDate: "asc" },
    take: 200,
  });
}
