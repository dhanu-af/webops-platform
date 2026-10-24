"use server";

import { db, withDbRetry } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notify, notifyUsers } from "@/lib/notifications";
import { storePhoto, getMaxPhotoBytes, isAllowedPhotoFile } from "@/lib/storage";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone } from "@/lib/timezone";
import { requireActiveUser, requireUserWithPermission } from "@/lib/session-user";
import { verifySignaturePassword } from "@/lib/signature";
import { APP_VERSION_STAMP } from "@/lib/app-version";
import {
  changedFields,
  failuresMissingCorrectiveAction,
  missingHeaderFields,
  numericVerdict,
  signatureMeaning,
  unansweredRequiredItems,
  unsignedCorrectiveActionCount,
  verifierConflict,
} from "@/lib/inspection-rules";
import { UserFacingError, runAction, type ActionResult } from "@/lib/user-error";
import { revalidatePath } from "next/cache";
import type { InspectionStatus, ResponseValue, Severity, VerificationAction, WorkflowRole } from "@/app/generated/prisma/client";

// Statuses in which the operator may still change answers. Anything else is a
// submitted/verified/closed record and is read-only (URS-11).
const EDITABLE_STATUSES: InspectionStatus[] = ["NOT_STARTED", "IN_PROGRESS", "RETURNED"];

function assertEditable(inspection: { status: InspectionStatus }) {
  if (!EDITABLE_STATUSES.includes(inspection.status)) throw new UserFacingError("This inspection is not open for editing.");
}

function assertOwnRecord(inspection: { operatorId: string | null }, userId: string) {
  if (inspection.operatorId && inspection.operatorId !== userId) throw new UserFacingError("This record belongs to another operator.");
}

// Lazy instantiation: Today's Ops "Start" turns a due ChecklistSchedule into
// a real Inspection the first time someone opens it today, rather than
// requiring a separate always-on cron worker for this MVP milestone (see
// HANDOVER.md — a Vercel Cron generator is the documented next step for
// true unattended recurrence).
export async function getOrCreateInspectionForSchedule(scheduleId: string) {
  const user = await requireUserWithPermission("inspection.create");
  const schedule = await db.checklistSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
    include: { checklist: { include: { versions: { where: { isCurrent: true } } } } },
  });

  // Must match the facility's timezone, not the server's (Vercel runs in
  // UTC) -- otherwise, for roughly the first ~10 hours of every real
  // Brisbane day (while the UTC calendar date is still "yesterday"), this
  // would find and reuse yesterday's already-closed inspection instead of
  // creating today's, even though the schedule list (which already used
  // startOfDayInTimeZone/endOfDayInTimeZone, see lib/data/by-category.ts)
  // correctly showed "Start" with no status badge for today.
  const timeZone = await getFacilityTimezone();
  const now = new Date();
  const existing = await db.inspection.findFirst({
    where: { scheduleId, createdAt: { gte: startOfDayInTimeZone(timeZone, now), lte: endOfDayInTimeZone(timeZone, now) } },
  });
  if (existing) return existing.id;

  const version = schedule.checklist.versions[0];
  const inspection = await db.inspection.create({
    data: {
      checklistVersionId: version.id,
      scheduleId: schedule.id,
      facilityId: schedule.facilityId,
      sectionId: schedule.sectionId,
      areaId: schedule.areaId,
      equipmentId: schedule.equipmentId,
      frequency: schedule.frequency,
      priority: schedule.priority,
      status: "NOT_STARTED",
      dueAt: new Date(),
      operatorId: user.role === "OPERATOR" || user.role === "TEAM_LEADER" ? user.id : null,
      appVersion: APP_VERSION_STAMP,
    },
  });
  await logAudit({ entityType: "Inspection", entityId: inspection.id, inspectionId: inspection.id, action: "CREATED", userId: user.id });
  return inspection.id;
}

export async function getInspection(inspectionId: string) {
  return db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: {
      checklistVersion: { include: { checklist: { include: { workflow: { include: { steps: true } } } }, items: { orderBy: { sortOrder: "asc" } } } },
      facility: true,
      section: true,
      area: true,
      equipment: true,
      operator: true,
      supervisor: true,
      qa: true,
      responses: { include: { photoEvidence: true, respondedBy: true, finding: { include: { correctiveAction: true, photoEvidence: true } } } },
      photoEvidence: true,
      verificationRecords: { include: { actor: true }, orderBy: { createdAt: "asc" } },
      areaRelease: true,
    },
  });
}

// Product / batch context for the record (URS-04). For line clearance and
// allergen changeover this is previous AND next product; for other checklists
// only the optional product/batch.
async function saveInspectionHeaderImpl(input: {
  inspectionId: string;
  product?: string;
  batchNumber?: string;
  previousProduct?: string;
  previousBatchNumber?: string;
}) {
  const user = await requireUserWithPermission("inspection.submit");
  const inspection = await db.inspection.findUniqueOrThrow({ where: { id: input.inspectionId } });
  assertEditable(inspection);
  assertOwnRecord(inspection, user.id);

  const next = {
    product: input.product?.trim() || null,
    batchNumber: input.batchNumber?.trim() || null,
    previousProduct: input.previousProduct?.trim() || null,
    previousBatchNumber: input.previousBatchNumber?.trim() || null,
  };
  await db.inspection.update({
    where: { id: inspection.id },
    data: { ...next, operatorId: inspection.operatorId ?? user.id },
  });

  // Changes after the record was first submitted are logged field by field with the reopen reason.
  if (inspection.submittedAt) {
    for (const c of changedFields(inspection, next)) {
      await logAudit({
        entityType: "Inspection",
        entityId: inspection.id,
        inspectionId: inspection.id,
        action: "EDITED",
        userId: user.id,
        fieldName: c.field,
        oldValue: { value: c.oldValue as string | null },
        newValue: { value: c.newValue as string | null },
        reason: inspection.reopenReason ?? "Edited after submission",
      });
    }
  }
  revalidatePath(`/inspections/${inspection.id}`);
}

export async function saveResponse(input: {
  inspectionId: string;
  checklistItemId: string;
  passFail?: ResponseValue;
  numericValue?: number;
  textValue?: string;
  choiceValue?: string;
  comment?: string;
}) {
  // Who and when are never taken from the caller: the user comes from the
  // session and every timestamp is written by the server/database (URS-06).
  const user = await requireUserWithPermission("inspection.submit");
  const inspection = await db.inspection.findUniqueOrThrow({ where: { id: input.inspectionId } });
  assertEditable(inspection);
  assertOwnRecord(inspection, user.id);

  const item = await db.checklistItem.findUniqueOrThrow({ where: { id: input.checklistItemId } });

  // A measured value outside the item's acceptable range is recorded as a FAIL
  // by the server, whatever the browser sent (URS-08). In range clears any
  // earlier FAIL so correcting a mistyped reading un-flags it.
  let passFail: ResponseValue | null | undefined = input.passFail;
  if (item.type === "NUMERIC" && input.numericValue !== undefined) passFail = numericVerdict(item, input.numericValue);

  const where = { inspectionId_checklistItemId: { inspectionId: input.inspectionId, checklistItemId: input.checklistItemId } };
  const before = await db.inspectionResponse.findUnique({ where });

  const response = await db.inspectionResponse.upsert({
    where,
    create: {
      inspectionId: input.inspectionId,
      checklistItemId: input.checklistItemId,
      passFail,
      numericValue: input.numericValue,
      textValue: input.textValue,
      choiceValue: input.choiceValue,
      comment: input.comment,
      respondedById: user.id,
    },
    update: {
      passFail,
      numericValue: input.numericValue,
      textValue: input.textValue,
      choiceValue: input.choiceValue,
      comment: input.comment,
      respondedById: user.id,
    },
  });

  // Edits to an already-submitted record (reopened after a return): keep the
  // original value and record who changed what, from what, to what, and why
  // (URS-11, URS-12). The original survives in the append-only audit trail.
  if (inspection.submittedAt) {
    for (const c of changedFields(before, { passFail, numericValue: input.numericValue, textValue: input.textValue, choiceValue: input.choiceValue, comment: input.comment })) {
      await logAudit({
        entityType: "InspectionResponse",
        entityId: response.id,
        inspectionId: inspection.id,
        action: "EDITED",
        userId: user.id,
        fieldName: c.field,
        oldValue: { item: item.prompt, value: c.oldValue as string | number | null },
        newValue: { item: item.prompt, value: c.newValue as string | number | null },
        reason: inspection.reopenReason ?? "Edited after submission",
      });
    }
  }

  if (inspection.status === "NOT_STARTED") {
    await db.inspection.update({
      where: { id: inspection.id },
      data: { status: "IN_PROGRESS", startedAt: new Date(), operatorId: inspection.operatorId ?? user.id },
    });
    await logAudit({ entityType: "Inspection", entityId: inspection.id, inspectionId: inspection.id, action: "STARTED", userId: user.id });
  } else if (!inspection.operatorId) {
    // Whoever enters the first answer is the operator of record.
    await db.inspection.update({ where: { id: inspection.id }, data: { operatorId: user.id } });
  }

  if (passFail === "FAIL") {
    await logAudit({
      entityType: "Inspection",
      entityId: inspection.id,
      inspectionId: inspection.id,
      action: "ITEM_FAILED",
      userId: user.id,
      newValue: { checklistItemId: input.checklistItemId, prompt: item.prompt },
    });

    // Any FAIL opens a Finding automatically (spec §15, URS-07) -- severity
    // defaults from the item's criticalFailure flag and can be refined later.
    // The operator must then record a corrective action before submitting.
    const existingFinding = await db.finding.findUnique({ where: { responseId: response.id } });
    if (!existingFinding) {
      const finding = await db.finding.create({
        data: {
          inspectionId: input.inspectionId,
          responseId: response.id,
          checklistItemId: item.id,
          areaId: inspection.areaId,
          equipmentId: inspection.equipmentId,
          description: item.prompt,
          severity: (item.criticalFailure ? "MAJOR" : "MINOR") as Severity,
          createdById: user.id,
        },
      });
      await logAudit({ entityType: "Finding", entityId: finding.id, inspectionId: inspection.id, action: "FINDING_CREATED", userId: user.id });
    }
  } else if (passFail !== undefined && !inspection.submittedAt) {
    // Value corrected away from FAIL while still a draft -- drop the finding
    // only if it's still a bare, untouched record: no corrective action and
    // no evidence photo attached. Once either exists it's real audit history,
    // not a misclick, so it must never be silently deleted. After the record
    // has been submitted nothing is ever deleted (URS-11).
    const current = await db.inspectionResponse.findUnique({
      where,
      include: { finding: { include: { correctiveAction: true, photoEvidence: true } } },
    });
    if (current?.finding && !current.finding.correctiveAction && current.finding.photoEvidence.length === 0) {
      await db.finding.delete({ where: { id: current.finding.id } });
    }
  }

  revalidatePath(`/inspections/${input.inspectionId}`);
}

export async function attachPhoto(formData: FormData) {
  const user = await requireUserWithPermission("inspection.submit");
  const inspectionId = formData.get("inspectionId") as string;
  const responseId = (formData.get("responseId") as string) || undefined;
  const findingId = (formData.get("findingId") as string) || undefined;
  const kind = (formData.get("kind") as "GENERAL" | "BEFORE" | "AFTER") || "GENERAL";
  const caption = (formData.get("caption") as string) || undefined;
  const file = formData.get("file") as File;

  if (!file || file.size === 0) throw new UserFacingError("No file provided.");
  const maxPhotoBytes = await getMaxPhotoBytes();
  if (file.size > maxPhotoBytes) throw new UserFacingError(`Photo exceeds ${Math.round(maxPhotoBytes / (1024 * 1024))}MB limit.`);
  if (!isAllowedPhotoFile(file)) throw new UserFacingError("Unsupported file type.");

  const inspection = await db.inspection.findUniqueOrThrow({ where: { id: inspectionId } });
  assertEditable(inspection);
  assertOwnRecord(inspection, user.id);
  const { url, sizeBytes } = await storePhoto(file);

  const photo = await db.photoEvidence.create({
    data: {
      inspectionId,
      responseId,
      findingId,
      areaId: inspection.areaId,
      equipmentId: inspection.equipmentId,
      kind,
      storagePath: url,
      filename: file.name,
      mimeType: file.type,
      sizeBytes,
      caption,
      uploadedById: user.id,
    },
  });

  await logAudit({ entityType: "PhotoEvidence", entityId: photo.id, inspectionId, action: "PHOTO_UPLOADED", userId: user.id });
  revalidatePath(`/inspections/${inspectionId}`);
  return photo.id;
}

export async function createFindingDetail(input: {
  findingId: string;
  reason?: string;
  severity: Severity;
  immediateCorrection?: string;
}) {
  const user = await requireUserWithPermission("inspection.submit");
  const finding = await db.finding.findUniqueOrThrow({ where: { id: input.findingId }, include: { inspection: true } });
  assertEditable(finding.inspection);
  assertOwnRecord(finding.inspection, user.id);
  await db.finding.update({
    where: { id: input.findingId },
    data: { reason: input.reason, severity: input.severity, immediateCorrection: input.immediateCorrection },
  });
  revalidatePath("/inspections");
}

// Statuses in which a corrective action may still be recorded: any time before
// the record is finally verified, by the operator or by a verifier who spots
// an unaddressed failure.
const CORRECTIVE_ACTION_STATUSES: InspectionStatus[] = [...EDITABLE_STATUSES, "SUBMITTED", "AWAITING_SUPERVISOR", "SUPERVISOR_APPROVED", "AWAITING_QA"];

async function createCorrectiveActionImpl(input: {
  findingId: string;
  rootCause?: string;
  correctiveAction: string;
  preventiveAction?: string;
  responsibleUserId?: string;
  dueDate?: string;
}) {
  const user = await requireUserWithPermission("inspection.submit", "inspection.verify.supervisor", "inspection.verify.qa");
  if (!input.correctiveAction?.trim()) throw new UserFacingError("Describe the corrective action taken or planned.");

  const finding = await db.finding.findUniqueOrThrow({ where: { id: input.findingId }, include: { inspection: true, correctiveAction: true } });
  if (!CORRECTIVE_ACTION_STATUSES.includes(finding.inspection.status)) throw new UserFacingError("This record is closed; corrective actions can no longer be added.");
  if (finding.correctiveAction) throw new UserFacingError("A corrective action already exists for this failure.");

  const responsibleUserId = input.responsibleUserId ?? user.id;
  const ca = await db.correctiveAction.create({
    data: {
      findingId: input.findingId,
      areaId: finding.areaId,
      equipmentId: finding.equipmentId,
      rootCause: input.rootCause?.trim() || undefined,
      correctiveAction: input.correctiveAction.trim(),
      preventiveAction: input.preventiveAction?.trim() || undefined,
      responsibleUserId,
      dueDate: input.dueDate ? new Date(input.dueDate) : new Date(),
    },
  });
  await db.finding.update({ where: { id: input.findingId }, data: { status: "CORRECTIVE_ACTION_CREATED" } });
  await logAudit({ entityType: "CorrectiveAction", entityId: ca.id, inspectionId: finding.inspectionId, action: "CORRECTIVE_ACTION_CREATED", userId: user.id, newValue: { correctiveAction: ca.correctiveAction } });
  if (responsibleUserId !== user.id) {
    await notify(responsibleUserId, "CORRECTIVE_ACTION_DUE", "Corrective action assigned", ca.correctiveAction, "/corrective-actions");
  }
  revalidatePath("/corrective-actions");
  revalidatePath(`/inspections/${finding.inspectionId}`);
}

// Sign-off of a corrective action by a Supervisor/QA (URS-07, URS-09). Until
// every corrective action on a record is signed off, that record cannot be
// approved and the line is not released.
async function closeCorrectiveActionImpl(id: string, password?: string) {
  const user = await requireActiveUser();
  if (!["SUPERVISOR", "TEAM_LEADER", "QA", "SUPER_ADMIN"].includes(user.role)) {
    throw new UserFacingError("Only a Supervisor or QA can sign off a corrective action.");
  }

  const existing = await db.correctiveAction.findUniqueOrThrow({
    where: { id },
    include: { finding: { include: { inspection: { include: { responses: { select: { respondedById: true } } } } } } },
  });
  const inspection = existing.finding.inspection;
  const conflict = verifierConflict({
    actorId: user.id,
    operatorId: inspection.operatorId,
    responderIds: inspection.responses.map((r) => r.respondedById).filter((x): x is string => !!x),
  });
  if (conflict) throw new UserFacingError(conflict);

  await verifySignaturePassword(user.id, password, "corrective action sign-off");

  const ca = await db.correctiveAction.update({
    where: { id },
    data: { status: "CLOSED", closedById: user.id, closedAt: new Date(), verifiedById: user.id, verifiedAt: new Date() },
    include: { finding: true },
  });
  await db.finding.update({ where: { id: ca.findingId }, data: { status: "CLOSED" } });
  await logAudit({
    entityType: "CorrectiveAction",
    entityId: ca.id,
    inspectionId: ca.finding.inspectionId,
    action: "CLOSED",
    userId: user.id,
    reason: `Signed off as Verified by ${user.name} (${user.role})`,
  });
  revalidatePath("/corrective-actions");
  revalidatePath(`/inspections/${ca.finding.inspectionId}`);
}

// Required items must be answered before submission; a required-photo item
// that failed must carry at least one photo before the operator can hand
// off to the next verification step (spec §15).
async function submitInspectionImpl(inspectionId: string) {
  const user = await requireUserWithPermission("inspection.submit");
  // Deliberately narrower than getInspection() (used for page rendering) — this
  // only needs items/responses for validation and a couple of display fields
  // for the notify() message, not the full page's supervisor/qa/verification/
  // areaRelease graph. Fewer joins means less query time on a cold Neon compute.
  const inspection = await withDbRetry(() =>
    db.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      select: {
        status: true,
        operatorId: true,
        areaId: true,
        product: true,
        batchNumber: true,
        previousProduct: true,
        previousBatchNumber: true,
        area: { select: { name: true } },
        checklistVersion: {
          select: {
            items: { orderBy: { sortOrder: "asc" } },
            checklist: { select: { name: true, category: true, workflow: { select: { steps: true } } } },
          },
        },
        responses: {
          select: {
            checklistItemId: true,
            passFail: true,
            numericValue: true,
            textValue: true,
            choiceValue: true,
            id: true,
            finding: { select: { photoEvidence: { select: { id: true } }, correctiveAction: { select: { status: true } } } },
          },
        },
        photoEvidence: { select: { responseId: true } },
      },
    })
  );

  assertEditable(inspection);
  if (inspection.operatorId && inspection.operatorId !== user.id) {
    throw new UserFacingError("Only the assigned operator can submit this inspection.");
  }

  // Record header: area/line, and previous + next product/batch where the
  // checklist type needs them. Blank required header fields block submission.
  const missingHeader = missingHeaderFields(inspection.checklistVersion.checklist.category, inspection);
  if (missingHeader.length) throw new UserFacingError(`Complete the record details before submitting: ${missingHeader.join(", ")}.`);

  const items = inspection.checklistVersion.items;
  const responseByItem = new Map(inspection.responses.map((r) => [r.checklistItemId, r]));
  const promptByItem = new Map(items.map((i) => [i.id, i.prompt]));

  // Required fields cannot be blank -- a saved but empty answer doesn't count (URS-05).
  const unanswered = unansweredRequiredItems(items, responseByItem);
  if (unanswered.length) throw new UserFacingError(`"${unanswered[0].prompt}" is required.${unanswered.length > 1 ? ` (${unanswered.length} required items are unanswered.)` : ""}`);

  for (const item of items) {
    const response = responseByItem.get(item.id);
    if (response?.passFail === "FAIL" && (item.requiresPhotoOnFail || item.criticalFailure)) {
      const hasPhoto = inspection.photoEvidence.some((p) => p.responseId === response.id) || response.finding?.photoEvidence?.length;
      if (!hasPhoto) throw new UserFacingError(`Photo evidence is required for the failed item "${item.prompt}".`);
    }
  }

  // Every failed item needs a corrective action entry before the record can leave the operator (URS-07).
  const noCorrectiveAction = failuresMissingCorrectiveAction(
    inspection.responses.map((r) => ({ passFail: r.passFail, prompt: promptByItem.get(r.checklistItemId) ?? "A failed item", finding: r.finding }))
  );
  if (noCorrectiveAction.length) {
    throw new UserFacingError(`A corrective action is required for the failed item "${noCorrectiveAction[0]}"${noCorrectiveAction.length > 1 ? ` and ${noCorrectiveAction.length - 1} more` : ""}.`);
  }

  const total = items.filter((i) => i.type === "PASS_FAIL" || i.type === "YES_NO").length;
  const passed = inspection.responses.filter((r) => r.passFail === "PASS").length;
  const score = total > 0 ? Math.round((passed / total) * 1000) / 10 : null;

  const steps = (inspection.checklistVersion.checklist.workflow?.steps ?? []).sort((a, b) => a.order - b.order);
  const nextStep = steps.find((s) => s.role !== "OPERATOR");
  const nextStatus = nextStep?.role === "SUPERVISOR" || nextStep?.role === "TEAM_LEADER" ? "AWAITING_SUPERVISOR" : nextStep?.role === "QA" ? "AWAITING_QA" : "CLOSED";

  const role: WorkflowRole | null = nextStatus === "AWAITING_SUPERVISOR" ? "SUPERVISOR" : nextStatus === "AWAITING_QA" ? "QA" : null;

  // The status update is the one write that must not be lost: it's retried on
  // its own against a transient Neon connection error (see withDbRetry), and
  // awaited to full completion before anything else runs. Running it inside a
  // Promise.all alongside other independent writes was tried and reverted —
  // if a sibling promise rejects first, Promise.all's own wrapper settles
  // before this one necessarily has, which is a real risk to rule out even
  // though it wasn't confirmed as the cause here (see HANDOVER.md).
  // submittedAt is the server's clock, never the device's (URS-06).
  await withDbRetry(() =>
    db.inspection.update({
      where: { id: inspectionId },
      data: {
        status: nextStatus,
        submittedAt: new Date(),
        score,
        operatorId: inspection.operatorId ?? user.id,
        returnedReason: null,
        reopenReason: null,
        appVersion: APP_VERSION_STAMP,
      },
    })
  );

  // Audit log and reviewer lookup are independent of each other and can run
  // concurrently — the submission itself has already succeeded by this point,
  // so neither should be able to make it look like it failed.
  const [, reviewers] = await Promise.all([
    withDbRetry(() =>
      logAudit({ entityType: "Inspection", entityId: inspectionId, inspectionId, action: "SUBMITTED", userId: user.id, newValue: { status: nextStatus, score } })
    ).catch((e) => console.error(`Failed to write audit log for inspection ${inspectionId}:`, e)),
    role
      ? withDbRetry(() => db.user.findMany({ where: { role: role === "SUPERVISOR" ? { in: ["SUPERVISOR", "TEAM_LEADER"] } : "QA", active: true } }))
      : Promise.resolve([]),
  ]);

  if (role) {
    // Notifications are best-effort: this submission has already succeeded
    // by this point, so a failure here is logged, not thrown. One batched
    // call (not one per reviewer) so extra recipients configured in Settings
    // get exactly one copy each, not one per role-holder.
    await notifyUsers(
      reviewers.map((reviewer) => reviewer.id),
      role === "SUPERVISOR" ? "SUPERVISOR_VERIFICATION_REQUIRED" : "QA_VERIFICATION_REQUIRED",
      `${inspection.checklistVersion.checklist.name} needs verification`,
      `${inspection.area?.name ?? "Facility"} — submitted by ${user.name}`,
      `/inspections/${inspectionId}`
    ).catch((e) => console.error(`Failed to notify reviewers of inspection ${inspectionId}:`, e));
  }

  revalidatePath("/inspections");
  revalidatePath(`/inspections/${inspectionId}`);
  revalidatePath("/dashboard");
}

async function verifyInspectionImpl(input: { inspectionId: string; action: VerificationAction; comment?: string; password?: string }) {
  // Live role from the database, not the JWT: a demoted or deactivated
  // verifier can't keep signing for the rest of their session.
  const user = await requireActiveUser();
  const inspection = await getInspection(input.inspectionId);

  const isSupervisorStep = inspection.status === "AWAITING_SUPERVISOR";
  const isQaStep = inspection.status === "AWAITING_QA";
  if (!isSupervisorStep && !isQaStep) throw new UserFacingError("This inspection is not awaiting verification.");

  const requiredRole = isSupervisorStep ? "SUPERVISOR" : "QA";
  if (requiredRole === "SUPERVISOR" && !["SUPERVISOR", "TEAM_LEADER", "SUPER_ADMIN"].includes(user.role)) {
    throw new UserFacingError("Only a Supervisor/Team Leader can perform this verification.");
  }
  if (requiredRole === "QA" && !["QA", "SUPER_ADMIN"].includes(user.role)) {
    throw new UserFacingError("Only QA can perform this verification.");
  }

  // Segregation of duties: not the operator, and not anyone who entered an answer (URS-02).
  const responderIds = inspection.responses.map((r) => r.respondedById).filter((x): x is string => !!x);
  const conflict = verifierConflict({ actorId: user.id, operatorId: inspection.operatorId, responderIds });
  if (conflict) throw new UserFacingError(conflict);

  if ((input.action === "RETURN" || input.action === "REJECT") && !input.comment) {
    throw new UserFacingError("A reason is required to return or reject an inspection.");
  }

  const steps = (inspection.checklistVersion.checklist.workflow?.steps ?? []).sort((a, b) => a.order - b.order);
  const hasQaStep = steps.some((s) => s.role === "QA");
  const isFinalStep = requiredRole === "QA" || !hasQaStep;

  // The line is not released while any failure's corrective action is still
  // awaiting Supervisor/QA sign-off (URS-07). Returning or rejecting is always allowed.
  if (input.action === "APPROVE") {
    const findings = await db.finding.findMany({ where: { inspectionId: inspection.id }, select: { correctiveAction: { select: { status: true, verifiedById: true } } } });
    const unsigned = unsignedCorrectiveActionCount(findings);
    if (unsigned > 0) {
      throw new UserFacingError(`${unsigned} corrective action${unsigned === 1 ? " is" : "s are"} not signed off yet. Sign off every corrective action before approving.`);
    }
  }

  // Electronic signature: re-enter the password at the moment of signing (URS-09).
  await verifySignaturePassword(user.id, input.password, `${input.action.toLowerCase()} of inspection ${inspection.id}`);

  await db.verificationRecord.create({
    data: {
      inspectionId: inspection.id,
      stepRole: requiredRole,
      actorId: user.id,
      action: input.action,
      comment: input.comment,
      signerName: user.name,
      signerRole: user.role,
      meaning: signatureMeaning(input.action, isFinalStep),
      passwordReverified: true,
      appVersion: APP_VERSION_STAMP,
    },
  });

  if (input.action === "RETURN" || input.action === "REJECT") {
    await db.inspection.update({
      where: { id: inspection.id },
      data: {
        status: input.action === "RETURN" ? "RETURNED" : "REJECTED",
        returnedReason: input.action === "RETURN" ? input.comment : null,
        rejectedReason: input.action === "REJECT" ? input.comment : null,
      },
    });
    await logAudit({ entityType: "Inspection", entityId: inspection.id, inspectionId: inspection.id, action: input.action === "RETURN" ? "RETURNED" : "REJECTED", userId: user.id, reason: input.comment });
    if (inspection.operatorId) {
      await notify(inspection.operatorId, input.action === "RETURN" ? "RETURNED" : "REJECTED", `${inspection.checklistVersion.checklist.name} ${input.action === "RETURN" ? "returned" : "rejected"}`, input.comment!, `/inspections/${inspection.id}`);
    }
    revalidatePath("/inspections");
    revalidatePath(`/inspections/${inspection.id}`);
    return;
  }

  // APPROVE
  if (requiredRole === "SUPERVISOR") {
    const nextStatus = hasQaStep ? "AWAITING_QA" : "CLOSED";

    await db.inspection.update({ where: { id: inspection.id }, data: { status: nextStatus, supervisorId: user.id } });
    await logAudit({ entityType: "Inspection", entityId: inspection.id, inspectionId: inspection.id, action: "SUPERVISOR_APPROVED", userId: user.id });

    if (hasQaStep && inspection.checklistVersion.checklist.workflow?.requiresAreaRelease && inspection.areaId) {
      await db.areaRelease.upsert({
        where: { inspectionId: inspection.id },
        create: { areaId: inspection.areaId, inspectionId: inspection.id, status: "AWAITING_QA", supervisorId: user.id, supervisorAt: new Date() },
        update: { status: "AWAITING_QA", supervisorId: user.id, supervisorAt: new Date() },
      });
      const qaUsers = await db.user.findMany({ where: { role: "QA", active: true } });
      await notifyUsers(
        qaUsers.map((qa) => qa.id),
        "QA_VERIFICATION_REQUIRED",
        "QA verification required",
        `${inspection.area?.name} — supervisor approved`,
        `/inspections/${inspection.id}`
      );
    } else if (!hasQaStep) {
      if (inspection.operatorId) {
        await notify(inspection.operatorId, "AREA_RELEASED", "Inspection closed", `${inspection.checklistVersion.checklist.name} approved and closed.`, `/inspections/${inspection.id}`);
      }
    }
  } else {
    // QA final approval
    await db.inspection.update({ where: { id: inspection.id }, data: { status: "QA_APPROVED", qaId: user.id } });
    await logAudit({ entityType: "Inspection", entityId: inspection.id, inspectionId: inspection.id, action: "QA_APPROVED", userId: user.id });

    if (inspection.checklistVersion.checklist.workflow?.requiresAreaRelease && inspection.areaId) {
      await db.areaRelease.upsert({
        where: { inspectionId: inspection.id },
        create: { areaId: inspection.areaId, inspectionId: inspection.id, status: "QA_RELEASED", qaId: user.id, qaAt: new Date(), releasedAt: new Date() },
        update: { status: "QA_RELEASED", qaId: user.id, qaAt: new Date(), releasedAt: new Date() },
      });
      await logAudit({ entityType: "AreaRelease", entityId: inspection.areaId, inspectionId: inspection.id, action: "AREA_RELEASED", userId: user.id });
    }

    await db.inspection.update({ where: { id: inspection.id }, data: { status: "CLOSED" } });
    await logAudit({ entityType: "Inspection", entityId: inspection.id, inspectionId: inspection.id, action: "CLOSED", userId: user.id });

    if (inspection.operatorId) {
      await notify(inspection.operatorId, "AREA_RELEASED", "Inspection closed", `${inspection.checklistVersion.checklist.name} QA approved and closed.`, `/inspections/${inspection.id}`);
    }
  }

  revalidatePath("/inspections");
  revalidatePath(`/inspections/${inspection.id}`);
  revalidatePath("/dashboard");
}

// A returned record goes back to its operator for correction. Reopening needs
// a reason (URS-11); every answer changed while it's open is then audited with
// its old value, new value and that reason (URS-12).
async function resubmitReturnedInspectionImpl(inspectionId: string, reason?: string) {
  const user = await requireUserWithPermission("inspection.submit");
  if (!reason || reason.trim().length < 5) throw new UserFacingError("Give a reason for reopening this record (at least 5 characters).");

  const inspection = await db.inspection.findUniqueOrThrow({ where: { id: inspectionId } });
  if (inspection.status !== "RETURNED") throw new UserFacingError("Only a returned record can be reopened for correction.");
  assertOwnRecord(inspection, user.id);

  await db.inspection.update({ where: { id: inspectionId }, data: { status: "IN_PROGRESS", reopenReason: reason.trim() } });
  await logAudit({
    entityType: "Inspection",
    entityId: inspectionId,
    inspectionId,
    action: "EDITED",
    userId: user.id,
    fieldName: "status",
    oldValue: { value: "RETURNED" },
    newValue: { value: "IN_PROGRESS" },
    reason: reason.trim(),
  });
  revalidatePath(`/inspections/${inspectionId}`);
}

// Exported entry points: validation failures come back as { ok: false, error }
// so the message survives production error redaction (see lib/user-error.ts).
export async function saveInspectionHeader(input: {
  inspectionId: string;
  product?: string;
  batchNumber?: string;
  previousProduct?: string;
  previousBatchNumber?: string;
}): Promise<ActionResult> {
  return runAction(() => saveInspectionHeaderImpl(input));
}

export async function createCorrectiveAction(input: {
  findingId: string;
  rootCause?: string;
  correctiveAction: string;
  preventiveAction?: string;
  responsibleUserId?: string;
  dueDate?: string;
}): Promise<ActionResult> {
  return runAction(() => createCorrectiveActionImpl(input));
}

export async function closeCorrectiveAction(id: string, password?: string): Promise<ActionResult> {
  return runAction(() => closeCorrectiveActionImpl(id, password));
}

export async function submitInspection(inspectionId: string): Promise<ActionResult> {
  return runAction(() => submitInspectionImpl(inspectionId));
}

export async function verifyInspection(input: { inspectionId: string; action: VerificationAction; comment?: string; password?: string }): Promise<ActionResult> {
  return runAction(() => verifyInspectionImpl(input));
}

export async function resubmitReturnedInspection(inspectionId: string, reason?: string): Promise<ActionResult> {
  return runAction(() => resubmitReturnedInspectionImpl(inspectionId, reason));
}

// On-demand start (no schedule needed): anyone with permission picks any active
// checklist and the place it is for, then fills and submits it for verification
// like a scheduled one. If this person already has an unfinished on-demand
// record for the same checklist and place, it is reopened instead of duplicated.
export async function startAdHocInspection(input: {
  checklistId: string;
  areaId: string | null;
}): Promise<{ ok: true; inspectionId: string } | { ok: false; error: string }> {
  try {
    const user = await requireUserWithPermission("inspection.create");

    const checklist = await db.checklist.findUnique({
      where: { id: input.checklistId },
      include: { versions: { where: { isCurrent: true }, take: 1 } },
    });
    const version = checklist?.versions[0];
    if (!checklist || !checklist.active) throw new UserFacingError("That checklist is not available.");
    if (!version) throw new UserFacingError("That checklist has no published version yet.");

    let facilityId: string;
    let sectionId: string | null = null;
    let areaId: string | null = null;
    if (input.areaId) {
      const area = await db.area.findUnique({ where: { id: input.areaId }, include: { section: true } });
      if (!area) throw new UserFacingError("That area no longer exists.");
      facilityId = area.section.facilityId;
      sectionId = area.sectionId;
      areaId = area.id;
    } else {
      const facility = await db.facility.findFirst({ orderBy: { createdAt: "asc" } });
      if (!facility) throw new UserFacingError("No facility is set up yet.");
      facilityId = facility.id;
    }

    const open = await db.inspection.findFirst({
      where: {
        checklistVersion: { checklistId: checklist.id },
        scheduleId: null,
        areaId,
        status: { in: EDITABLE_STATUSES },
        OR: [{ operatorId: null }, { operatorId: user.id }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (open) return { ok: true, inspectionId: open.id };

    const inspection = await db.inspection.create({
      data: {
        checklistVersionId: version.id,
        facilityId,
        sectionId,
        areaId,
        frequency: "AD_HOC",
        status: "NOT_STARTED",
        dueAt: new Date(),
        operatorId: user.role === "OPERATOR" || user.role === "TEAM_LEADER" ? user.id : null,
        appVersion: APP_VERSION_STAMP,
      },
    });
    await logAudit({
      entityType: "Inspection",
      entityId: inspection.id,
      inspectionId: inspection.id,
      action: "CREATED",
      userId: user.id,
      reason: "Started on demand (not from a schedule)",
    });
    return { ok: true, inspectionId: inspection.id };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    throw e;
  }
}
