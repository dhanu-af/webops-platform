"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { storeCalibrationCertificate, isAllowedCertificateFile, MAX_CERTIFICATE_BYTES } from "@/lib/storage";

async function requireCalibrationManager() {
  const session = await auth();
  if (!session?.user) throw new UserFacingError("Not authenticated");
  requirePermission(session.user.role, "calibration.manage");
  return session.user;
}

async function recordCalibration__impl(formData: FormData) {
  const actor = await requireCalibrationManager();

  const equipmentId = formData.get("equipmentId") as string;
  const calibratedDate = formData.get("calibratedDate") as string;
  const intervalDays = Number(formData.get("intervalDays"));
  const performedBy = (formData.get("performedBy") as string)?.trim();
  const certificateNumber = (formData.get("certificateNumber") as string)?.trim() || undefined;
  const notes = (formData.get("notes") as string)?.trim() || undefined;
  const file = formData.get("certificate") as File | null;

  if (!equipmentId) throw new UserFacingError("Equipment is required.");
  if (!calibratedDate) throw new UserFacingError("Calibration date is required.");
  if (!performedBy) throw new UserFacingError("Performed by is required.");
  if (!Number.isFinite(intervalDays) || intervalDays <= 0) throw new UserFacingError("Calibration interval must be a positive number of days.");

  const equipment = await db.equipment.findUniqueOrThrow({ where: { id: equipmentId } });

  let certificateUrl: string | undefined;
  if (file && file.size > 0) {
    if (file.size > MAX_CERTIFICATE_BYTES) throw new UserFacingError(`Certificate exceeds ${Math.round(MAX_CERTIFICATE_BYTES / (1024 * 1024))}MB limit.`);
    if (!isAllowedCertificateFile(file)) throw new UserFacingError("Unsupported file type — PDF, JPG, or PNG only.");
    const stored = await storeCalibrationCertificate(file);
    certificateUrl = stored.url;
  }

  const calibratedAt = new Date(calibratedDate);
  const dueDate = new Date(calibratedAt.getTime() + intervalDays * 86_400_000);

  const record = await db.equipmentCalibration.create({
    data: {
      equipmentId,
      calibratedDate: calibratedAt,
      intervalDays,
      dueDate,
      performedBy,
      certificateNumber,
      certificateUrl,
      notes,
      createdById: actor.id,
    },
  });

  await logAudit({
    entityType: "EquipmentCalibration",
    entityId: record.id,
    action: "CREATED",
    userId: actor.id,
    newValue: { equipmentId, equipmentName: equipment.name, calibratedDate: calibratedAt, dueDate, performedBy },
  });

  revalidatePath("/calibration");
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function recordCalibration(...args: Parameters<typeof recordCalibration__impl>) {
  return guard(() => recordCalibration__impl(...args));
}
