import { db } from "@/lib/db";
import { startOfDay, endOfDay, subDays } from "date-fns";
import type { Frequency, InspectionStatus } from "@/app/generated/prisma/client";

export type ReportFilters = {
  from?: string;
  to?: string;
  areaId?: string;
  frequency?: string;
  status?: string;
};

function parseDateParam(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Defaults to the trailing 30 days when no range is given — reports should
// never silently query the entire inspection history by default.
export function resolveReportRange(filters: ReportFilters): { from: Date; to: Date } {
  const to = endOfDay(parseDateParam(filters.to) ?? new Date());
  const from = startOfDay(parseDateParam(filters.from) ?? subDays(to, 29));
  return { from, to };
}

function buildInspectionWhere(filters: ReportFilters) {
  const { from, to } = resolveReportRange(filters);
  return {
    createdAt: { gte: from, lte: to },
    areaId: filters.areaId || undefined,
    frequency: filters.frequency ? (filters.frequency as Frequency) : undefined,
    status: filters.status ? (filters.status as InspectionStatus) : undefined,
  };
}

export async function getReportInspections(filters: ReportFilters = {}, limit = 500) {
  return db.inspection.findMany({
    where: buildInspectionWhere(filters),
    include: {
      checklistVersion: { include: { checklist: true } },
      facility: true,
      section: true,
      area: true,
      equipment: true,
      operator: true,
      supervisor: true,
      qa: true,
      findings: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getReportSummary(filters: ReportFilters = {}) {
  const where = buildInspectionWhere(filters);

  const [total, closed, scoreAgg, openFindings, criticalFindings, overdueCorrectiveActions] = await Promise.all([
    db.inspection.count({ where }),
    db.inspection.count({ where: { ...where, status: "CLOSED" } }),
    db.inspection.aggregate({ where: { ...where, score: { not: null } }, _avg: { score: true } }),
    db.finding.count({ where: { status: { not: "CLOSED" }, inspection: where } }),
    db.finding.count({ where: { severity: "CRITICAL", status: { not: "CLOSED" }, inspection: where } }),
    db.correctiveAction.count({
      where: { status: { not: "CLOSED" }, dueDate: { lt: new Date() }, finding: { inspection: where } },
    }),
  ]);

  return {
    total,
    closed,
    completionRate: total > 0 ? Math.round((closed / total) * 100) : null,
    avgScore: scoreAgg._avg.score !== null && scoreAgg._avg.score !== undefined ? Math.round(scoreAgg._avg.score) : null,
    openFindings,
    criticalFindings,
    overdueCorrectiveActions,
  };
}

export async function getReportAreaOptions() {
  return db.area.findMany({ where: { archived: false }, include: { section: true }, orderBy: { name: "asc" } });
}
