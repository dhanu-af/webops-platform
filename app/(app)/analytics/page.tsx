import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getUserScope } from "@/lib/scope";
import {
  resolveReportRange,
  getReportAreaOptions,
  type ReportFilters,
} from "@/lib/data/reports";
import { getFacilityTimezone, formatDateInTimeZone } from "@/lib/timezone";
import {
  getScoreTrend,
  getAreaPerformance,
  getFindingsBySeverityByArea,
  getCorrectiveActionAging,
} from "@/lib/data/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ScoreTrendChart,
  AreaPerformanceChart,
  FindingsBySeverityChart,
  CorrectiveActionAgingChart,
} from "@/components/analytics/charts";

type AnalyticsFilters = Pick<ReportFilters, "from" | "to" | "areaId">;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsFilters>;
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.view")) notFound();
  const scope = getUserScope(session.user);

  const filters = await searchParams;
  const timeZone = await getFacilityTimezone();
  const { from, to } = await resolveReportRange(filters);

  const [trend, areaPerformance, findingsBySeverity, aging, areas] =
    await Promise.all([
      getScoreTrend(filters, scope),
      getAreaPerformance(filters, scope),
      getFindingsBySeverityByArea(filters, scope),
      getCorrectiveActionAging(filters, scope),
      scope.scoped ? Promise.resolve([]) : getReportAreaOptions(),
    ]);

  const fromValue = formatDateInTimeZone(from, timeZone);
  const toValue = formatDateInTimeZone(to, timeZone);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="text-sm text-muted">
          Trends, recurring findings, and corrective action ageing for
          management.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-muted-strong">
                From
              </label>
              <input
                type="date"
                name="from"
                defaultValue={fromValue}
                className="mt-1.5 block rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-strong">
                To
              </label>
              <input
                type="date"
                name="to"
                defaultValue={toValue}
                className="mt-1.5 block rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            {!scope.scoped && (
              <div>
                <label className="text-xs font-medium text-muted-strong">
                  Area
                </label>
                <select
                  name="areaId"
                  defaultValue={filters.areaId ?? ""}
                  className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="">All areas</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.section.name} / {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" size="sm">
              Apply
            </Button>
            {!scope.scoped && filters.areaId && (
              <Link
                href={`/analytics?from=${fromValue}&to=${toValue}`}
                className="text-sm text-muted-strong hover:text-foreground"
              >
                Clear filters
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ScoreTrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Area Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <AreaPerformanceChart data={areaPerformance} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Corrective Action Ageing</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <CorrectiveActionAgingChart data={aging} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recurring Findings by Area</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <FindingsBySeverityChart data={findingsBySeverity} />
        </CardContent>
      </Card>
    </div>
  );
}
