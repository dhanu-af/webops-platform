import { db } from "@/lib/db";
import { format, eachDayOfInterval, differenceInCalendarDays } from "date-fns";
import { resolveReportRange, type ReportFilters } from "@/lib/data/reports";

export type ScoreTrendPoint = { date: string; label: string; avgScore: number | null };

export async function getScoreTrend(filters: ReportFilters): Promise<ScoreTrendPoint[]> {
  const { from, to } = resolveReportRange(filters);
  const inspections = await db.inspection.findMany({
    where: { createdAt: { gte: from, lte: to }, score: { not: null }, areaId: filters.areaId || undefined },
    select: { createdAt: true, score: true },
  });

  const byDay = new Map<string, { sum: number; count: number }>();
  for (const insp of inspections) {
    const key = format(insp.createdAt, "yyyy-MM-dd");
    const entry = byDay.get(key) ?? { sum: 0, count: 0 };
    entry.sum += insp.score!;
    entry.count += 1;
    byDay.set(key, entry);
  }

  return eachDayOfInterval({ start: from, end: to }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const entry = byDay.get(key);
    return { date: key, label: format(day, "d MMM"), avgScore: entry ? Math.round(entry.sum / entry.count) : null };
  });
}

export type AreaPerformancePoint = { name: string; avgScore: number; count: number };

export async function getAreaPerformance(filters: ReportFilters): Promise<AreaPerformancePoint[]> {
  const { from, to } = resolveReportRange(filters);
  const inspections = await db.inspection.findMany({
    where: { createdAt: { gte: from, lte: to }, score: { not: null }, areaId: filters.areaId || undefined },
    select: { score: true, area: { select: { id: true, name: true } } },
  });

  const byArea = new Map<string, { name: string; sum: number; count: number }>();
  for (const insp of inspections) {
    if (!insp.area) continue;
    const entry = byArea.get(insp.area.id) ?? { name: insp.area.name, sum: 0, count: 0 };
    entry.sum += insp.score!;
    entry.count += 1;
    byArea.set(insp.area.id, entry);
  }

  return [...byArea.values()]
    .map((e) => ({ name: e.name, avgScore: Math.round(e.sum / e.count), count: e.count }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

export type FindingsByAreaPoint = { name: string; CRITICAL: number; MAJOR: number; MINOR: number };

// Findings, not inspections, are the unit here — one inspection can carry several
// findings, and the point of this chart is which *areas* keep recurring, not which
// single inspection they came from.
export async function getFindingsBySeverityByArea(filters: ReportFilters): Promise<FindingsByAreaPoint[]> {
  const { from, to } = resolveReportRange(filters);
  const findings = await db.finding.findMany({
    where: { createdAt: { gte: from, lte: to }, areaId: filters.areaId || undefined },
    select: { severity: true, area: { select: { name: true } } },
  });

  const byArea = new Map<string, FindingsByAreaPoint>();
  for (const f of findings) {
    const name = f.area?.name ?? "Unassigned";
    const entry = byArea.get(name) ?? { name, CRITICAL: 0, MAJOR: 0, MINOR: 0 };
    entry[f.severity] += 1;
    byArea.set(name, entry);
  }

  return [...byArea.values()]
    .sort((a, b) => b.CRITICAL + b.MAJOR + b.MINOR - (a.CRITICAL + a.MAJOR + a.MINOR))
    .slice(0, 8);
}

export type AgingBucket = { label: string; tone: "pass" | "warn" | "attention" | "critical"; count: number };

// Deliberately not scoped to the report date range — "ageing" describes actions
// that are open *right now*, regardless of when the report window happens to start.
export async function getCorrectiveActionAging(filters: Pick<ReportFilters, "areaId"> = {}): Promise<AgingBucket[]> {
  const openActions = await db.correctiveAction.findMany({
    where: { status: { not: "CLOSED" }, areaId: filters.areaId || undefined },
    select: { createdAt: true },
  });

  const buckets: AgingBucket[] = [
    { label: "0-3 days", tone: "pass", count: 0 },
    { label: "4-7 days", tone: "warn", count: 0 },
    { label: "8-14 days", tone: "attention", count: 0 },
    { label: "15-30 days", tone: "critical", count: 0 },
    { label: "30+ days", tone: "critical", count: 0 },
  ];
  const thresholds = [3, 7, 14, 30, Infinity];

  const now = new Date();
  for (const a of openActions) {
    const age = differenceInCalendarDays(now, a.createdAt);
    const index = thresholds.findIndex((max) => age <= max);
    buckets[index === -1 ? buckets.length - 1 : index].count += 1;
  }

  return buckets;
}
