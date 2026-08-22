import { db } from "@/lib/db";
import {
  getFacilityTimezone,
  startOfDayInTimeZone,
  endOfDayInTimeZone,
  startOfMonthInTimeZone,
  formatDateSlashInTimeZone,
  monthNameInTimeZone,
} from "@/lib/timezone";

export type FiveSLeaderboardEntry = {
  areaId: string;
  areaName: string;
  sectionName: string;
  score: number;
  responseCount: number;
};

export type FiveSPeriod = { label: string; entries: FiveSLeaderboardEntry[] };

// Deliberately facility-wide, not run through lib/scope.ts's scopeWhere --
// this is a leaderboard meant to be visible to everyone regardless of their
// own assigned area, not a personal task list.
async function computeLeaderboard(from: Date, to: Date): Promise<FiveSLeaderboardEntry[]> {
  const responses = await db.inspectionResponse.findMany({
    where: {
      checklistItem: { checklistVersion: { checklist: { category: "FIVE_S" } } },
      numericValue: { not: null },
      createdAt: { gte: from, lte: to },
      inspection: { areaId: { not: null } },
    },
    select: {
      numericValue: true,
      inspection: { select: { area: { select: { id: true, name: true, section: { select: { name: true } } } } } },
    },
  });

  const byArea = new Map<string, { areaName: string; sectionName: string; sum: number; count: number }>();
  for (const r of responses) {
    const area = r.inspection.area;
    if (!area) continue;
    const entry = byArea.get(area.id) ?? { areaName: area.name, sectionName: area.section.name, sum: 0, count: 0 };
    entry.sum += r.numericValue ?? 0;
    entry.count += 1;
    byArea.set(area.id, entry);
  }

  return [...byArea.entries()]
    .map(([areaId, e]) => ({
      areaId,
      areaName: e.areaName,
      sectionName: e.sectionName,
      score: Math.round((e.sum / e.count / 5) * 1000) / 10,
      responseCount: e.count,
    }))
    .sort((a, b) => b.score - a.score);
}

// Three ranked snapshots (today / rolling 7 days / month-to-date) computed
// together so the client-side period toggle is instant, no re-fetch.
export async function getFiveSLeaderboards(): Promise<{ daily: FiveSPeriod; weekly: FiveSPeriod; monthly: FiveSPeriod }> {
  const timeZone = await getFacilityTimezone();
  const now = new Date();
  const dayStart = startOfDayInTimeZone(timeZone, now);
  const dayEnd = endOfDayInTimeZone(timeZone, now);
  const weekStart = startOfDayInTimeZone(timeZone, new Date(now.getTime() - 7 * 86400000));
  const monthStart = startOfMonthInTimeZone(timeZone, now);

  const [daily, weekly, monthly] = await Promise.all([
    computeLeaderboard(dayStart, dayEnd),
    computeLeaderboard(weekStart, dayEnd),
    computeLeaderboard(monthStart, dayEnd),
  ]);

  return {
    daily: { label: formatDateSlashInTimeZone(now, timeZone), entries: daily },
    weekly: { label: `${formatDateSlashInTimeZone(weekStart, timeZone)} - ${formatDateSlashInTimeZone(now, timeZone)}`, entries: weekly },
    monthly: { label: monthNameInTimeZone(timeZone, now), entries: monthly },
  };
}
