import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAuditLog, resolveAuditRange, AUDIT_ENTITY_TYPES, type AuditFilters } from "@/lib/data/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  "SUPERVISOR_REVIEWED",
  "SUPERVISOR_APPROVED",
  "RETURNED",
  "REJECTED",
  "QA_REVIEWED",
  "QA_APPROVED",
  "CLOSED",
  "LOGIN",
  "AREA_RELEASED",
];

export default async function AuditPage({ searchParams }: { searchParams: Promise<AuditFilters> }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.view")) notFound();

  const filters = await searchParams;
  const { from, to } = resolveAuditRange(filters);
  const entries = await getAuditLog(filters);

  const fromValue = format(from, "yyyy-MM-dd");
  const toValue = format(to, "yyyy-MM-dd");
  const hasExtraFilters = Boolean(filters.entityType || filters.action);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Audit Trail</h1>
        <p className="text-sm text-muted">Every state-changing action, immutable and fully traceable — who did what, and when.</p>
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
              <label className="text-xs font-medium text-muted-strong">Entity</label>
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
              <label className="text-xs font-medium text-muted-strong">Action</label>
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
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong">
              Apply
            </button>
            {hasExtraFilters && (
              <Link href={`/audit?from=${fromValue}&to=${toValue}`} className="text-sm text-muted-strong hover:text-foreground">
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
        <CardContent className="overflow-x-auto pt-2">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Entity</th>
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const meta = AUDIT_ACTION_META[entry.action];
                const detail = entry.reason ?? (entry.newValue ? JSON.stringify(entry.newValue) : null);
                return (
                  <tr key={entry.id} className="hover:bg-surface-sunken">
                    <td className="py-2.5 font-mono-tabular text-xs text-muted">{format(entry.createdAt, "d MMM yyyy, HH:mm")}</td>
                    <td className="py-2.5">
                      {entry.inspectionId ? (
                        <Link href={`/inspections/${entry.inspectionId}`} className="font-medium text-foreground hover:text-accent">
                          {entry.entityType}
                        </Link>
                      ) : (
                        <span className="text-foreground">{entry.entityType}</span>
                      )}
                      <span className="ml-1.5 font-mono-tabular text-xs text-muted">{entry.entityId.slice(0, 8)}</span>
                    </td>
                    <td className="py-2.5">
                      <Badge tone={meta?.tone ?? "neutral"}>{meta?.label ?? entry.action}</Badge>
                    </td>
                    <td className="py-2.5 text-muted-strong">{entry.user.name}</td>
                    <td className="py-2.5 max-w-[280px] truncate text-xs text-muted" title={detail ?? undefined}>
                      {detail ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length === 0 && <p className="py-8 text-center text-sm text-muted">No audit entries in this range.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
