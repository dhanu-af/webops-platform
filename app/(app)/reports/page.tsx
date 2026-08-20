import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getReportInspections, getReportSummary, getReportAreaOptions, resolveReportRange, type ReportFilters } from "@/lib/data/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { ClipboardList, CheckCircle2, ShieldCheck, FlagTriangleRight, AlertTriangle, Download, FileText } from "lucide-react";

const FREQUENCIES = [
  "PER_SHIFT",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "AD_HOC",
  "BEFORE_PRODUCTION",
  "AFTER_PRODUCTION",
  "AFTER_CLEANING",
  "AFTER_MAINTENANCE",
] as const;

const STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "AWAITING_SUPERVISOR",
  "SUPERVISOR_APPROVED",
  "AWAITING_QA",
  "QA_APPROVED",
  "CLOSED",
  "RETURNED",
  "REJECTED",
  "OVERDUE",
] as const;

function buildQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.areaId) params.set("areaId", filters.areaId);
  if (filters.frequency) params.set("frequency", filters.frequency);
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportFilters> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.view")) notFound();
  const canExport = can(session.user.role, "reports.export");

  const filters = await searchParams;
  const { from, to } = resolveReportRange(filters);

  const [summary, inspections, areas] = await Promise.all([
    getReportSummary(filters),
    getReportInspections(filters),
    getReportAreaOptions(),
  ]);

  const fromValue = format(from, "yyyy-MM-dd");
  const toValue = format(to, "yyyy-MM-dd");
  const hasExtraFilters = Boolean(filters.areaId || filters.frequency || filters.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted">Daily operations, cleaning, 5S, compliance, corrective action and audit evidence reports.</p>
        </div>
        {canExport && (
          <div className="flex gap-2">
            <Button href={`/api/reports/export/pdf${buildQuery(filters)}`} variant="secondary">
              <FileText className="size-4" /> Export PDF
            </Button>
            <Button href={`/api/reports/export${buildQuery(filters)}`} variant="secondary">
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-muted-strong">From</label>
              <input
                type="date"
                name="from"
                defaultValue={fromValue}
                className="mt-1.5 block rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-strong">To</label>
              <input
                type="date"
                name="to"
                defaultValue={toValue}
                className="mt-1.5 block rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-strong">Area</label>
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
            <div>
              <label className="text-xs font-medium text-muted-strong">Frequency</label>
              <select
                name="frequency"
                defaultValue={filters.frequency ?? ""}
                className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">All frequencies</option>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-strong">Status</label>
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {INSPECTION_STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong">
              Apply
            </button>
            {hasExtraFilters && (
              <Link href={`/reports?from=${fromValue}&to=${toValue}`} className="text-sm text-muted-strong hover:text-foreground">
                Clear filters
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Inspections" value={summary.total} icon={ClipboardList} />
        <KpiCard
          label="Completed"
          value={summary.completionRate ?? "—"}
          suffix={summary.completionRate !== null ? "%" : undefined}
          icon={CheckCircle2}
          tone="pass"
        />
        <KpiCard label="Avg Score" value={summary.avgScore ?? "—"} suffix={summary.avgScore !== null ? "%" : undefined} icon={ShieldCheck} tone="accent" />
        <KpiCard label="Open Findings" value={summary.openFindings} icon={FlagTriangleRight} tone={summary.openFindings > 0 ? "critical" : "neutral"} />
        <KpiCard
          label="Critical Findings"
          value={summary.criticalFindings}
          icon={AlertTriangle}
          tone={summary.criticalFindings > 0 ? "critical" : "neutral"}
        />
        <KpiCard
          label="Overdue CAs"
          value={summary.overdueCorrectiveActions}
          icon={AlertTriangle}
          tone={summary.overdueCorrectiveActions > 0 ? "warn" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Inspections in range ({inspections.length}
            {inspections.length === 500 ? "+ — showing first 500" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-2">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Checklist</th>
                <th className="pb-2 font-medium">Area</th>
                <th className="pb-2 font-medium">Operator</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Findings</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inspections.map((insp) => {
                const meta = INSPECTION_STATUS_META[insp.status];
                return (
                  <tr key={insp.id} className="hover:bg-surface-sunken">
                    <td className="py-2.5">
                      <Link href={`/inspections/${insp.id}`} className="font-medium text-foreground hover:text-accent">
                        {insp.checklistVersion.checklist.name}
                      </Link>
                    </td>
                    <td className="py-2.5 text-muted-strong">{insp.area?.name ?? insp.section?.name ?? "—"}</td>
                    <td className="py-2.5 text-muted-strong">{insp.operator?.name ?? "—"}</td>
                    <td className="py-2.5 font-mono-tabular text-muted-strong">{insp.score !== null ? `${insp.score}%` : "—"}</td>
                    <td className="py-2.5 font-mono-tabular text-muted-strong">{insp.findings.length || "—"}</td>
                    <td className="py-2.5">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="py-2.5 font-mono-tabular text-xs text-muted">{format(insp.createdAt, "d MMM yyyy")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {inspections.length === 0 && <p className="py-8 text-center text-sm text-muted">No inspections in this range.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
