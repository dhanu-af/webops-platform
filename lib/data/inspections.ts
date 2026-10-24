import { db } from "@/lib/db";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone, todayLabelInTimeZone } from "@/lib/timezone";
import { scopeWhere, type UserScope } from "@/lib/scope";
import { scheduleAppliesOnDay } from "@/lib/schedule-recurrence";
import { statusesForRecordStatus } from "@/lib/record-status";
import { SAFE_USER } from "@/lib/safe-user";

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
      assignedUser: { select: { name: true } },
      inspections: { where: { createdAt: { gte: startOfDayInTimeZone(timeZone, now), lte: endOfDayInTimeZone(timeZone, now) } }, take: 1 },
    },
    orderBy: [{ dueTime: "asc" }],
  });

  // Same recurrence-day fix as getSchedulesByCategory (lib/data/by-category.ts)
  // -- without it a WEEKLY/MONTHLY schedule shows as freshly "not started"
  // every day instead of only on its actual due day.
  return schedules.filter((s) => scheduleAppliesOnDay(s, today));
}

// Search filters for the record register (URS-14): date range, line/area,
// product or batch (previous or next), operator, and status.
export type InspectionFilters = {
  status?: string;
  recordStatus?: string; // Draft | Submitted | Verified | Rejected
  sectionId?: string;
  areaId?: string;
  frequency?: string;
  q?: string; // checklist name
  from?: string; // YYYY-MM-DD, facility-local
  to?: string; // YYYY-MM-DD, facility-local
  operatorId?: string;
  product?: string; // matches product or batch, previous or next
};

export async function listInspections(filters: InspectionFilters = {}, scope: UserScope = { scoped: false }) {
  const timeZone = await getFacilityTimezone();
  // Day boundaries are the facility's, not UTC's (Vercel runs in UTC).
  const dayStart = filters.from ? startOfDayInTimeZone(timeZone, new Date(`${filters.from}T12:00:00Z`)) : undefined;
  const dayEnd = filters.to ? endOfDayInTimeZone(timeZone, new Date(`${filters.to}T12:00:00Z`)) : undefined;
  const recordStatuses = filters.recordStatus ? statusesForRecordStatus(filters.recordStatus) : undefined;
  const product = filters.product?.trim();

  return db.inspection.findMany({
    where: {
      status: filters.status ? (filters.status as never) : recordStatuses ? { in: recordStatuses } : undefined,
      sectionId: filters.sectionId || undefined,
      areaId: filters.areaId || undefined,
      frequency: filters.frequency ? (filters.frequency as never) : undefined,
      operatorId: filters.operatorId || undefined,
      createdAt: dayStart || dayEnd ? { gte: dayStart, lte: dayEnd } : undefined,
      checklistVersion: filters.q ? { checklist: { name: { contains: filters.q, mode: "insensitive" } } } : undefined,
      ...(product
        ? {
            OR: [
              { product: { contains: product, mode: "insensitive" } },
              { batchNumber: { contains: product, mode: "insensitive" } },
              { previousProduct: { contains: product, mode: "insensitive" } },
              { previousBatchNumber: { contains: product, mode: "insensitive" } },
            ],
          }
        : {}),
      ...scopeWhere(scope),
    },
    include: {
      checklistVersion: { include: { checklist: true } },
      area: true,
      section: true,
      operator: { select: SAFE_USER },
      supervisor: { select: SAFE_USER },
      qa: { select: SAFE_USER },
      findings: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listCorrectiveActions(filters: { status?: string; areaId?: string } = {}, scope: UserScope = { scoped: false }) {
  // CorrectiveAction only ever has a specific areaId (no section/facility-wide
  // variant), so an exact match is the whole scope rule here - no hierarchy.
  return db.correctiveAction.findMany({
    where: {
      status: filters.status ? (filters.status as never) : undefined,
      areaId: scope.scoped ? { in: scope.areaIds } : filters.areaId || undefined,
    },
    include: {
      finding: { include: { inspection: { include: { checklistVersion: { include: { checklist: true } } } } } },
      area: true,
      equipment: true,
      responsibleUser: { select: SAFE_USER },
    },
    orderBy: { dueDate: "asc" },
    take: 200,
  });
}
