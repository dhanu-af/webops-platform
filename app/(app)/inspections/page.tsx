import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { db } from "@/lib/db";
import { listInspections } from "@/lib/data/inspections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INSPECTION_STATUS_META } from "@/lib/status";
import { getFacilityTimezone, formatDayInTimeZone } from "@/lib/timezone";
import type { InspectionStatus } from "@/app/generated/prisma/client";

const STATUSES: InspectionStatus[] = [
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
];

export default async function InspectionsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    areaId?: string;
    sectionId?: string;
    q?: string;
  }>;
}) {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const filters = await searchParams;

  const [inspections, timeZone, areas] = await Promise.all([
    listInspections(filters, scope),
    getFacilityTimezone(),
    // Full-visibility users get a real section/area picker; a scoped user's
    // view is already locked to their own area, so they don't need one.
    scope.scoped
      ? Promise.resolve([])
      : db.area.findMany({
          where: { archived: false },
          include: { section: { include: { facility: true } } },
          orderBy: [
            { section: { facility: { name: "asc" } } },
            { section: { sortOrder: "asc" } },
            { sortOrder: "asc" },
          ],
        }),
  ]);

  const hasExtraFilters = Boolean(
    filters.status || filters.areaId || filters.sectionId || filters.q,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Inspection History
        </h1>
        <p className="text-sm text-muted">
          {scope.scoped
            ? "Every inspection performed in your area — fully traceable."
            : "Every inspection ever performed — fully traceable."}
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-muted-strong">
                Checklist name
              </label>
              <input
                type="text"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Search…"
                className="mt-1.5 block rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-strong">
                Status
              </label>
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {INSPECTION_STATUS_META[s]?.label ?? s}
                  </option>
                ))}
              </select>
            </div>
            {!scope.scoped && (
              <div>
                <label className="text-xs font-medium text-muted-strong">
                  Section / Area
                </label>
                <select
                  name="areaId"
                  defaultValue={filters.areaId ?? ""}
                  className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="">All departments</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.section.facility.name} / {a.section.name} / {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" size="sm">
              Apply
            </Button>
            {hasExtraFilters && (
              <Link
                href="/inspections"
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
          <CardTitle>
            Records ({inspections.length}
            {inspections.length === 100 ? "+ — showing latest 100" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[820px]">
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Checklist</TableHeaderCell>
                <TableHeaderCell>Area</TableHeaderCell>
                <TableHeaderCell>Operator</TableHeaderCell>
                <TableHeaderCell>Score</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspections.map((insp) => {
                const meta = INSPECTION_STATUS_META[insp.status];
                return (
                  <TableRow key={insp.id}>
                    <TableCell>
                      <Link
                        href={`/inspections/${insp.id}`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {insp.checklistVersion.checklist.name}
                      </Link>
                      {insp.findings.length > 0 && (
                        <span className="ml-2 text-xs text-status-critical">
                          {insp.findings.length} finding
                          {insp.findings.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-strong">
                      {insp.area?.name ?? insp.section?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-strong">
                      {insp.operator?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono-tabular text-muted-strong">
                      {insp.score !== null ? `${insp.score}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="font-mono-tabular text-xs text-muted">
                      {formatDayInTimeZone(insp.createdAt, timeZone)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {inspections.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              No inspections recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
