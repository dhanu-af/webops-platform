"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session-user";
import { logAudit } from "@/lib/audit";
import { isAllowedQcAttachmentFile, storeQcAttachment, MAX_QC_ATTACHMENT_BYTES } from "@/lib/storage";
import type { QcAttachmentKind } from "@/app/generated/prisma/client";

async function requireAccess() {
  return requireLiveUser("qc.manage");
}

async function attachQcSampleFile__impl(formData: FormData) {
  const actor = await requireAccess();

  const sampleId = String(formData.get("sampleId") ?? "");
  const kind = formData.get("kind") as QcAttachmentKind;
  const file = formData.get("file") as File | null;
  if (!sampleId || !kind) throw new UserFacingError("Sample and attachment kind are required");
  if (!file || file.size === 0) throw new UserFacingError("Choose a file to upload");
  if (file.size > MAX_QC_ATTACHMENT_BYTES) throw new UserFacingError("File is too large (10 MB max)");
  if (!isAllowedQcAttachmentFile(file)) throw new UserFacingError("Unsupported file type — PDF, JPG, PNG, WEBP, or HEIC only");

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

async function deleteQcSampleAttachment__impl(id: string) {
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
    oldValue: { kind: attachment.kind, fileName: attachment.fileName, url: attachment.url },
    reason: `Removed ${attachment.kind.replace("_", " ").toLowerCase()} "${attachment.fileName}" from sample ${attachment.sample.sampleId}`,
  });

  revalidatePath("/qc-samples");
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function attachQcSampleFile(...args: Parameters<typeof attachQcSampleFile__impl>) {
  return guard(() => attachQcSampleFile__impl(...args));
}

export async function deleteQcSampleAttachment(...args: Parameters<typeof deleteQcSampleAttachment__impl>) {
  return guard(() => deleteQcSampleAttachment__impl(...args));
}
