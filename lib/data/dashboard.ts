import { db } from "@/lib/db";
import { isPast } from "date-fns";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone, startOfMonthInTimeZone } from "@/lib/timezone";
import { scopeWhere, type UserScope } from "@/lib/scope";
import { getCalibrationStatus } from "@/lib/calibration";

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

// Lean aggregate counts for the dashboard's Corrective Actions KPI card --
// deliberately not the full listCorrectiveActions() (lib/data/inspections.ts),
// which joins finding/area/equipment/responsibleUser for the full records
// page. OVERDUE is computed the same way the Corrective Actions page itself
// does (isPast(dueDate) && status !== "CLOSED"), never persisted as a status.
export async function getCorrectiveActionSummary(scope: UserScope = { scoped: false }) {
  const actions = await db.correctiveAction.findMany({
    where: { areaId: scope.scoped ? { in: scope.areaIds } : undefined },
    select: { status: true, dueDate: true },
  });

  let open = 0;
  let overdue = 0;
  let closed = 0;
  for (const a of actions) {
    if (a.status === "CLOSED") closed++;
    else if (isPast(a.dueDate)) overdue++;
    else open++;
  }
  return { open, overdue, closed, total: actions.length };
}

// Lean aggregate counts for the dashboard's Equipment KPI card -- the fuller
// per-equipment listing with area/section names lives in
// listEquipmentCalibrationOverview (lib/data/calibration.ts), used by the
// Equipment Calibration page itself.
export async function getEquipmentCalibrationSummary(scope: UserScope = { scoped: false }) {
  const equipment = await db.equipment.findMany({
    where: { archived: false, areaId: scope.scoped ? { in: scope.areaIds } : undefined },
    select: { calibrations: { orderBy: { calibratedDate: "desc" }, take: 1, select: { dueDate: true } } },
  });

  let current = 0;
  let dueSoon = 0;
  let overdue = 0;
  let neverCalibrated = 0;
  for (const e of equipment) {
    const status = getCalibrationStatus(e.calibrations[0]?.dueDate ?? null);
    if (status === "CURRENT") current++;
    else if (status === "DUE_SOON") dueSoon++;
    else if (status === "OVERDUE") overdue++;
    else neverCalibrated++;
  }
  return { current, dueSoon, overdue, neverCalibrated, total: equipment.length };
}

export type OpsTrendPoint = { key: string; label: string; completed: number; inProgress: number; pending: number };

const COMPLETED_STATUSES = new Set(["QA_APPROVED", "CLOSED"]);
const IN_PROGRESS_STATUSES = new Set(["IN_PROGRESS", "SUBMITTED", "AWAITING_SUPERVISOR", "SUPERVISOR_APPROVED", "AWAITING_QA", "RETURNED"]);
// Everything else (NOT_STARTED, OVERDUE, REJECTED) buckets as "pending" --
// work that still needs someone to act on it.

function statusBucket(status: string): "completed" | "inProgress" | "pending" {
  if (COMPLETED_STATUSES.has(status)) return "completed";
  if (IN_PROGRESS_STATUSES.has(status)) return "inProgress";
  return "pending";
}

function hourBucketKey(at: Date, timeZone: string): { key: string; label: string } {
  const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hour12: false }).format(at);
  const normalized = hour === "24" ? "00" : hour;
  return { key: normalized, label: `${normalized}:00` };
}

function dayBucketKey(at: Date, timeZone: string): { key: string; label: string } {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const label = new Intl.DateTimeFormat("en-AU", { timeZone, day: "2-digit", month: "short" }).format(at);
  return { key, label };
}

function bucketInspections(
  inspections: Array<{ status: string; dueAt: Date | null; createdAt: Date }>,
  buckets: Array<{ key: string; label: string }>,
  keyFn: (at: Date) => { key: string },
): OpsTrendPoint[] {
  const points = new Map<string, OpsTrendPoint>(buckets.map((b) => [b.key, { ...b, completed: 0, inProgress: 0, pending: 0 }]));
  for (const insp of inspections) {
    const { key } = keyFn(insp.dueAt ?? insp.createdAt);
    const point = points.get(key);
    if (!point) continue; // outside the requested window's own bucket set
    point[statusBucket(insp.status)]++;
  }
  return [...points.values()];
}

// Three ranked-by-time windows computed together, same "compute everything
// up front" pattern as the 5S leaderboard (lib/data/five-s.ts) -- the
// client-side Today/Week/Month toggle just swaps which array feeds the
// chart, no re-fetch.
export async function getOperationsOverviewChart(scope: UserScope = { scoped: false }) {
  const timeZone = await getFacilityTimezone();
  const now = new Date();
  const scopeFilter = scopeWhere(scope);

  const todayStart = startOfDayInTimeZone(timeZone, now);
  const todayEnd = endOfDayInTimeZone(timeZone, now);
  const weekStart = startOfDayInTimeZone(timeZone, new Date(now.getTime() - 6 * 86400000));
  const monthStart = startOfMonthInTimeZone(timeZone, now);

  const windowWhere = (from: Date) => ({
    AND: [
      { OR: [{ dueAt: { gte: from, lte: todayEnd } }, { dueAt: null, createdAt: { gte: from, lte: todayEnd } }] },
      scopeFilter,
    ],
  });

  const [todayInspections, weekInspections, monthInspections] = await Promise.all([
    db.inspection.findMany({ where: windowWhere(todayStart), select: { status: true, dueAt: true, createdAt: true } }),
    db.inspection.findMany({ where: windowWhere(weekStart), select: { status: true, dueAt: true, createdAt: true } }),
    db.inspection.findMany({ where: windowWhere(monthStart), select: { status: true, dueAt: true, createdAt: true } }),
  ]);

  const hourBuckets = Array.from({ length: 24 }, (_, h) => hourBucketKey(new Date(todayStart.getTime() + h * 3_600_000), timeZone));
  const weekBuckets = Array.from({ length: 7 }, (_, i) => dayBucketKey(new Date(weekStart.getTime() + i * 86_400_000), timeZone));
  const monthDayCount = Math.round((todayStart.getTime() - monthStart.getTime()) / 86_400_000) + 1;
  const monthBuckets = Array.from({ length: monthDayCount }, (_, i) => dayBucketKey(new Date(monthStart.getTime() + i * 86_400_000), timeZone));

  return {
    today: bucketInspections(todayInspections, hourBuckets, (at) => hourBucketKey(at, timeZone)),
    week: bucketInspections(weekInspections, weekBuckets, (at) => dayBucketKey(at, timeZone)),
    month: bucketInspections(monthInspections, monthBuckets, (at) => dayBucketKey(at, timeZone)),
  };
}
