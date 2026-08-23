"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { isAllowedQcAttachmentFile, storeQcAttachment, MAX_QC_ATTACHMENT_BYTES } from "@/lib/storage";
import type { QcAttachmentKind } from "@/app/generated/prisma/client";

async function requireAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  requirePermission(session.user.role, "qc.manage");
  return session.user;
}

export async function attachQcSampleFile(formData: FormData) {
  const actor = await requireAccess();

  const sampleId = String(formData.get("sampleId") ?? "");
  const kind = formData.get("kind") as QcAttachmentKind;
  const file = formData.get("file") as File | null;
  if (!sampleId || !kind) throw new Error("Sample and attachment kind are required");
  if (!file || file.size === 0) throw new Error("Choose a file to upload");
  if (file.size > MAX_QC_ATTACHMENT_BYTES) throw new Error("File is too large (10 MB max)");
  if (!isAllowedQcAttachmentFile(file)) throw new Error("Unsupported file type — PDF, JPG, PNG, WEBP, or HEIC only");

  const sample = await db.qcSample.findUniqueOrThrow({ where: { id: sampleId } });
  const { url, sizeBytes } = await storeQcAttachment(file);

  const attachment = await db.qcSampleAttachment.create({
    data: {
      sampleId,
      kind,
      url,
      fileName: file.name,
      fileSizeBytes: sizeBytes,
      uploadedById: actor.id,
    },
  });

  await logAudit({
    entityType: "QcSample",
    entityId: sampleId,
    action: "QC_ATTACHMENT_ADDED",
    userId: actor.id,
    reason: `Attached ${kind.replace("_", " ").toLowerCase()} "${file.name}" to sample ${sample.sampleId}`,
  });

  revalidatePath("/qc-samples");
  return attachment;
}

export async function deleteQcSampleAttachment(id: string) {
  const actor = await requireAccess();

  const attachment = await db.qcSampleAttachment.findUniqueOrThrow({
    where: { id },
    include: { sample: { select: { sampleId: true } } },
  });

  await db.qcSampleAttachment.delete({ where: { id } });

  await logAudit({
    entityType: "QcSample",
    entityId: attachment.sampleId,
    action: "QC_ATTACHMENT_REMOVED",
    userId: actor.id,
    reason: `Removed ${attachment.kind.replace("_", " ").toLowerCase()} "${attachment.fileName}" from sample ${attachment.sample.sampleId}`,
  });

  revalidatePath("/qc-samples");
}
