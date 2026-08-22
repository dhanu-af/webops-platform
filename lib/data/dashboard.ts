import { db } from "@/lib/db";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone } from "@/lib/timezone";
import { scopeWhere, type UserScope } from "@/lib/scope";

export async function getDashboardKpis(scope: UserScope = { scoped: false }) {
  const now = new Date();
  const timeZone = await getFacilityTimezone();
  const todayStart = startOfDayInTimeZone(timeZone, now);
  const todayEnd = endOfDayInTimeZone(timeZone, now);
  const scopeFilter = scopeWhere(scope);

  const [
    todayTotal,
    todayCompleted,
    overdue,
    awaitingSupervisor,
    awaitingQa,
    openFindings,
    closedLast30,
    totalLast30,
    fiveSResponses,
  ] = await Promise.all([
    db.inspection.count({ where: { dueAt: { gte: todayStart, lte: todayEnd }, ...scopeFilter } }),
    db.inspection.count({
      where: { dueAt: { gte: todayStart, lte: todayEnd }, status: { in: ["SUPERVISOR_APPROVED", "QA_APPROVED", "CLOSED", "SUBMITTED", "AWAITING_SUPERVISOR", "AWAITING_QA"] }, ...scopeFilter },
    }),
    db.inspection.count({ where: { status: "OVERDUE", ...scopeFilter } }),
    db.inspection.count({ where: { status: "AWAITING_SUPERVISOR", ...scopeFilter } }),
    db.inspection.count({ where: { status: "AWAITING_QA", ...scopeFilter } }),
    db.finding.count({ where: { status: { not: "CLOSED" }, inspection: scope.scoped ? { ...scopeFilter } : undefined } }),
    db.inspection.count({
      where: { status: { in: ["QA_APPROVED", "CLOSED"] }, createdAt: { gte: new Date(now.getTime() - 30 * 86400000) }, ...scopeFilter },
    }),
    db.inspection.count({
      where: { status: { notIn: ["NOT_STARTED", "IN_PROGRESS"] }, createdAt: { gte: new Date(now.getTime() - 30 * 86400000) }, ...scopeFilter },
    }),
    db.inspectionResponse.findMany({
      where: {
        checklistItem: { checklistVersion: { checklist: { category: "FIVE_S" } } },
        numericValue: { not: null },
        createdAt: { gte: new Date(now.getTime() - 30 * 86400000) },
        inspection: scope.scoped ? { ...scopeFilter } : undefined,
      },
      select: { numericValue: true },
    }),
  ]);

  const compliance = totalLast30 > 0 ? Math.round((closedLast30 / totalLast30) * 1000) / 10 : null;
  const fiveSScore =
    fiveSResponses.length > 0
      ? Math.round(
          (fiveSResponses.reduce((sum, r) => sum + (r.numericValue ?? 0), 0) / fiveSResponses.length / 5) * 1000
        ) / 10
      : null;

  return {
    compliance,
    todayTotal,
    todayCompleted,
    overdue,
    awaitingSupervisor,
    awaitingQa,
    openFindings,
    fiveSScore,
  };
}

export async function getFacilityStatusMap(scope: UserScope = { scoped: false }) {
  const areas = await db.area.findMany({
    where: { archived: false, id: scope.scoped ? { in: scope.areaIds } : undefined },
    orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      section: { include: { facility: true } },
      areaReleases: { orderBy: { createdAt: "desc" }, take: 1 },
      findings: { where: { status: { not: "CLOSED" } } },
      correctiveActions: { where: { status: { not: "CLOSED" } } },
      inspections: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { operator: true, supervisor: true, qa: true },
      },
    },
  });

  return areas.map((area) => {
    const lastInspection = area.inspections[0];
    const release = area.areaReleases[0];
    return {
      id: area.id,
      name: area.name,
      sectionName: area.section.name,
      facilityName: area.section.facility.name,
      releaseStatus: release?.status ?? "NOT_RELEASED",
      lastInspectionAt: lastInspection?.createdAt ?? null,
      lastInspectionStatus: lastInspection?.status ?? null,
      openFindings: area.findings.length,
      openCorrectiveActions: area.correctiveActions.length,
      responsiblePerson: lastInspection?.operator?.name ?? null,
    };
  });
}
