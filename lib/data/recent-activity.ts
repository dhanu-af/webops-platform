import { db } from "@/lib/db";
import { scopeWhere, type UserScope } from "@/lib/scope";

// Feeds the dashboard's Recent Activity timeline -- a lighter, differently-
// scoped cousin of getAuditLog (lib/data/audit.ts), which backs the full
// Audit Trail page and is intentionally never area-scoped (that page is
// reports.view-only, meant to see everything). A scoped Operator/Team
// Leader/Supervisor's dashboard should only surface activity tied to their
// own area's inspections; entries with no inspection at all (logins, user
// edits, facility/area config changes) aren't area-scopable and are simply
// excluded from a scoped feed rather than shown to everyone.
export async function getRecentActivity(scope: UserScope = { scoped: false }, limit = 8) {
  const entries = await db.auditLog.findMany({
    where: scope.scoped ? { inspection: scopeWhere(scope) } : undefined,
    include: {
      user: { select: { name: true } },
      inspection: { select: { area: { select: { name: true } }, checklistVersion: { select: { checklist: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return entries.map((e) => ({
    id: e.id,
    action: e.action,
    createdAt: e.createdAt,
    actorName: e.user.name,
    areaName: e.inspection?.area?.name ?? null,
    checklistName: e.inspection?.checklistVersion.checklist.name ?? null,
    entityType: e.entityType,
  }));
}
