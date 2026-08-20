"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireSettingsManager() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  // Facility-wide configuration is the same tier as Areas & Equipment —
  // both describe the physical/organisational structure, not day-to-day ops.
  requirePermission(session.user.role, "areas.manage");
  return session.user;
}

export async function updateFacilityTimezone(facilityId: string, timezone: string) {
  const actor = await requireSettingsManager();

  if (!Intl.supportedValuesOf("timeZone").includes(timezone)) {
    throw new Error(`"${timezone}" is not a recognised IANA timezone.`);
  }

  const facility = await db.facility.findUniqueOrThrow({ where: { id: facilityId } });
  if (facility.timezone === timezone) return;

  await db.facility.update({ where: { id: facilityId }, data: { timezone } });
  await logAudit({
    entityType: "Facility",
    entityId: facilityId,
    action: "EDITED",
    userId: actor.id,
    oldValue: { timezone: facility.timezone },
    newValue: { timezone },
  });

  revalidatePath("/admin/settings");
}
