import { db } from "@/lib/db";
import { scopeWhere, type UserScope } from "@/lib/scope";

// Everything needed to print one inspection as a complete GMP record (URS-15):
// the answers, failures and corrective actions, every electronic signature, and
// the full audit trail. Respects the same area scoping as the screens.
export async function getInspectionRecord(id: string, scope: UserScope) {
  const inspection = await db.inspection.findFirst({
    where: { id, ...scopeWhere(scope) },
    include: {
      checklistVersion: { include: { checklist: true, items: { orderBy: { sortOrder: "asc" } } } },
      facility: true,
      section: true,
      area: true,
      equipment: true,
      operator: { select: { name: true } },
      responses: {
        include: {
          respondedBy: { select: { name: true } },
          photoEvidence: { select: { id: true } },
          finding: { include: { correctiveAction: { include: { responsibleUser: { select: { name: true } }, verifiedBy: { select: { name: true } } } } } },
        },
      },
      verificationRecords: { include: { actor: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      areaRelease: true,
      auditLogEntries: { include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!inspection) return null;

  const settings = await db.systemSettings.findFirst({ select: { organizationName: true, retentionYears: true } });
  return { inspection, organizationName: settings?.organizationName ?? null, retentionYears: settings?.retentionYears ?? 3 };
}

export type InspectionRecord = NonNullable<Awaited<ReturnType<typeof getInspectionRecord>>>;
