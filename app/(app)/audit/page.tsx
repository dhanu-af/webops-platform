import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  getAuditLog,
  resolveAuditRange,
  AUDIT_ENTITY_TYPES,
  type AuditFilters,
} from "@/lib/data/audit";
import {
  getFacilityTimezone,
  formatDateInTimeZone,
  formatDateTimeInTimeZone,
} from "@/lib/timezone";
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
import { AUDIT_ACTION_META } from "@/lib/status";
import type { AuditAction } from "@/app/generated/prisma/client";

const AUDIT_ACTIONS: AuditAction[] = [
  "CREATED",
  "STARTED",
  "EDITED",
  "SUBMITTED",
  "ITEM_FAILED",
  "PHOTO_UPLOADED",
  "FINDING_CREATED",
  "CORRECTIVE_ACTION_CREATED",
  "SUPERVISOR_APPROVED",
  "RETURNED",
  "REJECTED",
  "QA_APPROVED",
  "CLOSED",
  "LOGIN",
  "AREA_RELEASED",
  "DRYING_STAGE_CHANGED",
];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditFilters>;
}) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.view")) notFound();

  const filters = await searchParams;
  const timeZone = await getFacilityTimezone();
  const { from, to } = await resolveAuditRange(filters);
  const entries = await getAuditLog(filters);

  const fromValue = formatDateInTimeZone(from, timeZone);
  const toValue = formatDateInTimeZone(to, timeZone);
  const hasExtraFilters = Boolean(filters.entityType || filters.action);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Audit Trail
        </h1>
        <p className="text-sm text-muted">
          Every state-changing action, immutable and fully traceable — who did
          what, and when.
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
            <div>
              <label className="text-xs font-medium text-muted-strong">
                Entity
              </label>
              <select
                name="entityType"
                defaultValue={filters.entityType ?? ""}
                className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">All entities</option>
                {AUDIT_ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-strong">
                Action
              </label>
              <select
                name="action"
                defaultValue={filters.action ?? ""}
                className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">All actions</option>
                {AUDIT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {AUDIT_ACTION_META[a]?.label ?? a}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              Apply
            </Button>
            {hasExtraFilters && (
              <Link
                href={`/audit?from=${fromValue}&to=${toValue}`}
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
            Entries ({entries.length}
            {entries.length === 200 ? "+ — showing latest 200" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[880px]">
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Entity</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Details</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => {
                const meta = AUDIT_ACTION_META[entry.action];
                const detail =
                  entry.reason ??
                  (entry.newValue ? JSON.stringify(entry.newValue) : null);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono-tabular text-xs text-muted">
                      {formatDateTimeInTimeZone(entry.createdAt, timeZone)}
                    </TableCell>
                    <TableCell>
                      {entry.inspectionId ? (
                        <Link
                          href={`/inspections/${entry.inspectionId}`}
                          className="font-medium text-foreground hover:text-accent"
                        >
                          {entry.entityType}
                        </Link>
                      ) : (
                        <span className="text-foreground">
                          {entry.entityType}
                        </span>
                      )}
                      <span className="ml-1.5 font-mono-tabular text-xs text-muted">
                        {entry.entityId.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge tone={meta?.tone ?? "neutral"}>
                        {meta?.label ?? entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-strong">
                      {entry.user.name}
                    </TableCell>
                    <TableCell
                      className="max-w-[280px] truncate text-xs text-muted"
                      title={detail ?? undefined}
                    >
                      {detail ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {entries.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              No audit entries in this range.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
