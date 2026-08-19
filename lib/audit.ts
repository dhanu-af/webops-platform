import { db } from "@/lib/db";
import type { AuditAction, Prisma } from "@/app/generated/prisma/client";

// Immutable state-change log (spec §28). Never update or delete a row here —
// only ever insert. Submitted inspection records must never be silently
// overwritten, so every mutation to Inspection/Finding/CorrectiveAction
// state should have a matching call to this function alongside it.
export async function logAudit(params: {
  entityType: string;
  entityId: string;
  inspectionId?: string;
  action: AuditAction;
  userId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  reason?: string;
}) {
  await db.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      inspectionId: params.inspectionId,
      action: params.action,
      userId: params.userId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      reason: params.reason,
    },
  });
}
