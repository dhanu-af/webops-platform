"use server";

import { db, withDbRetry } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify, notifyUsers } from "@/lib/notifications";
import { storePhoto, getMaxPhotoBytes, ALLOWED_PHOTO_TYPES } from "@/lib/storage";
import { canVerifyOwnWork } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type { ResponseValue, Severity, VerificationAction, WorkflowRole } from "@/app/generated/prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

// Lazy instantiation: Today's Ops "Start" turns a due ChecklistSchedule into
// a real Inspection the first time someone opens it today, rather than
// requiring a separate always-on cron worker for this MVP milestone (see
// HANDOVER.md — a Vercel Cron generator is the documented next step for
// true unattended recurrence).
export async function getOrCreateInspectionForSchedule(scheduleId: string) {
  const user = await requireUser();
  const schedule = await db.checklistSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
    include: { checklist: { include: { versions: { where: { isCurrent: true } } } } },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const existing = await db.inspection.findFirst({
    where: { scheduleId, createdAt: { gte: todayStart } },
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

export async function saveResponse(input: {
  inspectionId: string;
  checklistItemId: string;
  passFail?: ResponseValue;
  numericValue?: number;
  textValue?: string;
  choiceValue?: string;
  comment?: string;
}) {
  const user = await requireUser();
  const inspection = await db.inspection.findUniqueOrThrow({ where: { id: input.inspectionId } });
  if (inspection.status !== "NOT_STARTED" && inspection.status !== "IN_PROGRESS" && inspection.status !== "RETURNED") {
    throw new Error("This inspection is not open for editing.");
  }

  const item = await db.checklistItem.findUniqueOrThrow({ where: { id: input.checklistItemId } });

  await db.inspectionResponse.upsert({
    where: { inspectionId_checklistItemId: { inspectionId: input.inspectionId, checklistItemId: input.checklistItemId } },
    create: {
      inspectionId: input.inspectionId,
      checklistItemId: input.checklistItemId,
      passFail: input.passFail,
      numericValue: input.numericValue,
      textValue: input.textValue,
      choiceValue: input.choiceValue,
      comment: input.comment,
      respondedById: user.id,
    },
    update: {
      passFail: input.passFail,
      numericValue: input.numericValue,
      textValue: input.textValue,
      choiceValue: input.choiceValue,
      comment: input.comment,
      respondedById: user.id,
    },
  });

  if (inspection.status === "NOT_STARTED") {
    await db.inspection.update({ where: { id: inspection.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
    await logAudit({ entityType: "Inspection", entityId: inspection.id, inspectionId: inspection.id, action: "STARTED", userId: user.id });
  }

  // A FAIL on a required item opens a Finding automatically (spec §15) —
  // severity defaults from the item's criticalFailure flag and can be
  // refined later via createFinding when the operator adds detail.
  if (input.passFail === "FAIL" && item.required) {
    const response = await db.inspectionResponse.findUniqueOrThrow({
      where: { inspectionId_checklistItemId: { inspectionId: input.inspectionId, checklistItemId: input.checklistItemId } },
    });
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
  } else if (input.passFail !== "FAIL") {
    // Value corrected back to PASS/NA before submission — drop the finding
    // only if it's still a bare, untouched record: no corrective action and
    // no evidence photo attached. Once either exists it's real audit history,
    // not a misclick, so it must never be silently deleted.
    const response = await db.inspectionResponse.findUnique({
      where: { inspectionId_checklistItemId: { inspectionId: input.inspectionId, checklistItemId: input.checklistItemId } },
      include: { finding: { include: { correctiveAction: true, photoEvidence: true } } },
    });
    if (response?.finding && !response.finding.correctiveAction && response.finding.photoEvidence.length === 0) {
      await db.finding.delete({ where: { id: response.finding.id } });
    }
  }

  revalidatePath(`/inspections/${input.inspectionId}`);
}

export async function attachPhoto(formData: FormData) {
  const user = await requireUser();
  const inspectionId = formData.get("inspectionId") as string;
  const responseId = (formData.get("responseId") as string) || undefined;
  const findingId = (formData.get("findingId") as string) || undefined;
  const kind = (formData.get("kind") as "GENERAL" | "BEFORE" | "AFTER") || "GENERAL";
  const caption = (formData.get("caption") as string) || undefined;
  const file = formData.get("file") as File;

  if (!file || file.size === 0) throw new Error("No file provided.");
  const maxPhotoBytes = await getMaxPhotoBytes();
  if (file.size > maxPhotoBytes) throw new Error(`Photo exceeds ${Math.round(maxPhotoBytes / (1024 * 1024))}MB limit.`);
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) throw new Error("Unsupported file type.");

  const inspection = await db.inspection.findUniqueOrThrow({ where: { id: inspectionId } });
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
  const user = await requireUser();
  await db.finding.update({
    where: { id: input.findingId },
    data: { reason: input.reason, severity: input.severity, immediateCorrection: input.immediateCorrection },
  });
  revalidatePath("/inspections");
  void user;
}

export async function createCorrectiveAction(input: {
  findingId: string;
  rootCause?: string;
  correctiveAction: string;
  preventiveAction?: string;
  responsibleUserId: string;
  dueDate: string;
}) {
  const user = await requireUser();
  const finding = await db.finding.findUniqueOrThrow({ where: { id: input.findingId } });

  const ca = await db.correctiveAction.create({
    data: {
      findingId: input.findingId,
      areaId: finding.areaId,
      equipmentId: finding.equipmentId,
      rootCause: input.rootCause,
      correctiveAction: input.correctiveAction,
      preventiveAction: input.preventiveAction,
      responsibleUserId: input.responsibleUserId,
      dueDate: new Date(input.dueDate),
    },
  });
  await db.finding.update({ where: { id: input.findingId }, data: { status: "CORRECTIVE_ACTION_CREATED" } });
  await logAudit({ entityType: "CorrectiveAction", entityId: ca.id, inspectionId: finding.inspectionId, action: "CORRECTIVE_ACTION_CREATED", userId: user.id });
  await notify(input.responsibleUserId, "CORRECTIVE_ACTION_DUE", "Corrective action assigned", input.correctiveAction, "/corrective-actions");
  revalidatePath("/corrective-actions");
  revalidatePath(`/inspections/${finding.inspectionId}`);
}

export async function closeCorrectiveAction(id: string) {
  const user = await requireUser();
  const ca = await db.correctiveAction.update({
    where: { id },
    data: { status: "CLOSED", closedById: user.id, closedAt: new Date(), verifiedById: user.id, verifiedAt: new Date() },
    include: { finding: true },
  });
  await db.finding.update({ where: { id: ca.findingId }, data: { status: "CLOSED" } });
  await logAudit({ entityType: "CorrectiveAction", entityId: ca.id, inspectionId: ca.finding.inspectionId, action: "CLOSED", userId: user.id });
  revalidatePath("/corrective-actions");
}

// Required items must be answered before submission; a required-photo item
// that failed must carry at least one photo before the operator can hand
// off to the next verification step (spec §15).
export async function submitInspection(inspectionId: string) {
  const user = await requireUser();
  // Deliberately narrower than getInspection() (used for page rendering) — this
  // only needs items/responses for validation and a couple of display fields
  // for the notify() message, not the full page's supervisor/qa/verification/
  // areaRelease graph. Fewer joins means less query time on a cold Neon compute.
  const inspection = await withDbRetry(() =>
    db.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      select: {
        operatorId: true,
        area: { select: { name: true } },
        checklistVersion: {
          select: {
            items: { orderBy: { sortOrder: "asc" } },
            checklist: { select: { name: true, workflow: { select: { steps: true } } } },
          },
        },
        responses: { select: { checklistItemId: true, passFail: true, choiceValue: true, id: true, finding: { select: { photoEvidence: { select: { id: true } } } } } },
        photoEvidence: { select: { responseId: true } },
      },
    })
  );

  if (inspection.operatorId && inspection.operatorId !== user.id) {
    throw new Error("Only the assigned operator can submit this inspection.");
  }

  const items = inspection.checklistVersion.items;
  const responseByItem = new Map(inspection.responses.map((r) => [r.checklistItemId, r]));

  for (const item of items) {
    const response = responseByItem.get(item.id);
    if (item.required && !response) {
      throw new Error(`"${item.prompt}" is required.`);
    }
    // An ACKNOWLEDGEMENT item has no PASS/FAIL state — it's answered once
    // marked "DONE" or "NA" (see checklist-item-card.tsx / equipment-task-row.tsx).
    if (item.required && item.type === "ACKNOWLEDGEMENT" && response?.choiceValue !== "DONE" && response?.choiceValue !== "NA") {
      throw new Error(`"${item.prompt}" is required.`);
    }
    if (response?.passFail === "FAIL" && (item.requiresPhotoOnFail || item.criticalFailure)) {
      const hasPhoto = inspection.photoEvidence.some((p) => p.responseId === response.id) || response.finding?.photoEvidence?.length;
      if (!hasPhoto) throw new Error(`Photo evidence is required for the failed item "${item.prompt}".`);
    }
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
  await withDbRetry(() =>
    db.inspection.update({
      where: { id: inspectionId },
      data: { status: nextStatus, submittedAt: new Date(), score, operatorId: inspection.operatorId ?? user.id, returnedReason: null },
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

export async function verifyInspection(input: { inspectionId: string; action: VerificationAction; comment?: string }) {
  const user = await requireUser();
  const inspection = await getInspection(input.inspectionId);

  const isSupervisorStep = inspection.status === "AWAITING_SUPERVISOR";
  const isQaStep = inspection.status === "AWAITING_QA";
  if (!isSupervisorStep && !isQaStep) throw new Error("This inspection is not awaiting verification.");

  const requiredRole = isSupervisorStep ? "SUPERVISOR" : "QA";
  if (requiredRole === "SUPERVISOR" && !["SUPERVISOR", "TEAM_LEADER", "SUPER_ADMIN"].includes(user.role)) {
    throw new Error("Only a Supervisor/Team Leader can perform this verification.");
  }
  if (requiredRole === "QA" && !["QA", "SUPER_ADMIN"].includes(user.role)) {
    throw new Error("Only QA can perform this verification.");
  }
  if (!canVerifyOwnWork(user.id, inspection.operatorId)) {
    throw new Error("You cannot verify an inspection you performed yourself.");
  }

  await db.verificationRecord.create({
    data: { inspectionId: inspection.id, stepRole: requiredRole, actorId: user.id, action: input.action, comment: input.comment },
  });

  if (input.action === "RETURN" || input.action === "REJECT") {
    if (!input.comment) throw new Error("A reason is required to return or reject an inspection.");
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
      await notify(inspection.operatorId, input.action === "RETURN" ? "RETURNED" : "REJECTED", `${inspection.checklistVersion.checklist.name} ${input.action === "RETURN" ? "returned" : "rejected"}`, input.comment, `/inspections/${inspection.id}`);
    }
    revalidatePath("/inspections");
    revalidatePath(`/inspections/${inspection.id}`);
    return;
  }

  // APPROVE
  if (requiredRole === "SUPERVISOR") {
    const steps = (inspection.checklistVersion.checklist.workflow?.steps ?? []).sort((a, b) => a.order - b.order);
    const hasQaStep = steps.some((s) => s.role === "QA");
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

export async function resubmitReturnedInspection(inspectionId: string) {
  const user = await requireUser();
  await db.inspection.update({ where: { id: inspectionId }, data: { status: "IN_PROGRESS" } });
  await logAudit({ entityType: "Inspection", entityId: inspectionId, inspectionId, action: "EDITED", userId: user.id, reason: "Reopened after return for correction" });
  revalidatePath(`/inspections/${inspectionId}`);
}
