import { db } from "@/lib/db";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone } from "@/lib/timezone";

export async function getTodaySchedules() {
  const now = new Date();
  const timeZone = await getFacilityTimezone();
  return db.checklistSchedule.findMany({
    where: { active: true, startDate: { lte: now } },
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

export async function listInspections(filters: {
  status?: string;
  areaId?: string;
  frequency?: string;
  q?: string;
} = {}) {
  return db.inspection.findMany({
    where: {
      status: filters.status ? (filters.status as never) : undefined,
      areaId: filters.areaId || undefined,
      frequency: filters.frequency ? (filters.frequency as never) : undefined,
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

export async function listCorrectiveActions(filters: { status?: string } = {}) {
  return db.correctiveAction.findMany({
    where: { status: filters.status ? (filters.status as never) : undefined },
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
