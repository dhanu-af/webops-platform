import { db } from "@/lib/db";
import { subDays } from "date-fns";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone } from "@/lib/timezone";
import type { AuditAction } from "@/app/generated/prisma/client";

export type AuditFilters = {
  from?: string;
  to?: string;
  entityType?: string;
  action?: string;
};

function parseDateParam(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Defaults to the trailing 7 days — an audit log grows without bound, so
// unlike Reports' 30-day default this stays tighter unless asked otherwise.
// Uses the facility's timezone for the day boundaries, same reasoning as
// Today's Ops/Dashboard/Calendar/Reports — see lib/timezone.ts.
export async function resolveAuditRange(filters: AuditFilters): Promise<{ from: Date; to: Date }> {
  const timeZone = await getFacilityTimezone();
  const to = endOfDayInTimeZone(timeZone, parseDateParam(filters.to) ?? new Date());
  const from = startOfDayInTimeZone(timeZone, parseDateParam(filters.from) ?? subDays(to, 6));
  return { from, to };
}

export async function getAuditLog(filters: AuditFilters = {}, limit = 200) {
  const { from, to } = await resolveAuditRange(filters);
  return db.auditLog.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      entityType: filters.entityType || undefined,
      action: filters.action ? (filters.action as AuditAction) : undefined,
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Reflects the entityType strings actually passed to logAudit() across the
// codebase — grep `entityType:` in lib/ if new ones are added and this list
// goes stale.
export const AUDIT_ENTITY_TYPES = [
  "Inspection",
  "Finding",
  "PhotoEvidence",
  "CorrectiveAction",
  "AreaRelease",
  "Facility",
  "Section",
  "Area",
  "Equipment",
  "VerificationWorkflow",
  "SystemSettings",
  "NotificationSetting",
  "User",
];
