import { db } from "@/lib/db";
import type { UserScope } from "@/lib/scope";
import { getCalibrationStatus } from "@/lib/calibration";

// Equipment (like CorrectiveAction/Finding/PhotoEvidence) only ever carries a
// single specific areaId — no section/facility-wide variant — so scoping is
// a plain equality match, the same precedent listCorrectiveActions uses, not
// the scopeWhere() hierarchy helper (see lib/scope.ts's own comment on this).
export async function listEquipmentCalibrationOverview(scope: UserScope = { scoped: false }) {
  const equipment = await db.equipment.findMany({
    where: {
      archived: false,
      areaId: scope.scoped ? scope.areaId : undefined,
    },
    include: {
      area: { select: { id: true, name: true, section: { select: { name: true } } } },
      calibrations: { orderBy: { calibratedDate: "desc" }, take: 1 },
    },
    orderBy: [{ area: { name: "asc" } }, { name: "asc" }],
  });

  return equipment.map((e) => {
    const latest = e.calibrations[0] ?? null;
    return {
      id: e.id,
      name: e.name,
      code: e.code,
      areaName: e.area.name,
      sectionName: e.area.section.name,
      latestCalibration: latest,
      status: getCalibrationStatus(latest?.dueDate ?? null),
    };
  });
}

export async function listCalibrationHistory(equipmentId: string) {
  return db.equipmentCalibration.findMany({
    where: { equipmentId },
    include: { createdBy: { select: { name: true } } },
    orderBy: { calibratedDate: "desc" },
  });
}
