import { db } from "@/lib/db";
import { APP_VERSION_STAMP } from "@/lib/app-version";
import type { AuditAction, Prisma } from "@/app/generated/prisma/client";

// Immutable state-change log (spec §28, URS-12). Never update or delete a row
// here -- only ever insert; the database itself rejects UPDATE/DELETE on this
// table (migration urs_immutability_triggers). Submitted inspection records
// must never be silently overwritten, so every mutation to
// Inspection/Finding/CorrectiveAction state should have a matching call to
// this function alongside it.
//
// Each entry answers: who (userId), what (entityType/entityId/action, plus
// fieldName for a field-level change), old and new value, when (createdAt, set
// by the database), and why (reason). appVersion links it to the release.
export async function logAudit(
  params: {
  entityType: string;
  entityId: string;
  inspectionId?: string;
  action: AuditAction;
  userId: string;
  fieldName?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  reason?: string;
  },
  // Pass the transaction client so the audit row commits or fails together with the change it records.
  client: Pick<typeof db, "auditLog"> = db
) {
  await client.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      inspectionId: params.inspectionId,
      action: params.action,
      userId: params.userId,
      fieldName: params.fieldName,
      oldValue: params.oldValue,
      newValue: params.newValue,
      reason: params.reason,
      appVersion: APP_VERSION_STAMP,
    },
  });
}
