import { db } from "@/lib/db";
import type { UserScope } from "@/lib/scope";
import { getCalibrationStatus, type CalibrationStatus } from "@/lib/calibration";

// Most urgent first -- within a section/area group, what actually needs
// attention floats to the top rather than sitting wherever alphabetical
// equipment-name order happens to put it.
const STATUS_PRIORITY: Record<CalibrationStatus, number> = {
  OVERDUE: 0,
  DUE_SOON: 1,
  NEVER_CALIBRATED: 2,
  CURRENT: 3,
};

function byUrgency<T extends { status: CalibrationStatus; latestCalibration: { dueDate: Date } | null; name: string }>(a: T, b: T) {
  const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
  if (priorityDiff !== 0) return priorityDiff;
  const aDue = a.latestCalibration?.dueDate?.getTime();
  const bDue = b.latestCalibration?.dueDate?.getTime();
  if (aDue !== undefined && bDue !== undefined) return aDue - bDue;
  if (aDue !== undefined) return -1;
  if (bDue !== undefined) return 1;
  return a.name.localeCompare(b.name);
}

// Equipment (like CorrectiveAction/Finding/PhotoEvidence) only ever carries a
// single specific areaId — no section/facility-wide variant — so scoping is
// a plain equality match, the same precedent listCorrectiveActions uses, not
// the scopeWhere() hierarchy helper (see lib/scope.ts's own comment on this).
export async function listEquipmentCalibrationOverview(scope: UserScope = { scoped: false }) {
  const equipment = await db.equipment.findMany({
    where: {
      archived: false,
      areaId: scope.scoped ? { in: scope.areaIds } : undefined,
    },
    include: {
      area: { select: { id: true, name: true, section: { select: { name: true } } } },
      calibrations: { orderBy: { calibratedDate: "desc" }, take: 1 },
    },
    orderBy: [{ area: { section: { sortOrder: "asc" } } }, { area: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return equipment.map((e) => {
    const latest = e.calibrations[0] ?? null;
    return {
      id: e.id,
      name: e.name,
      code: e.code,
      areaId: e.area.id,
      areaName: e.area.name,
      sectionName: e.area.section.name,
      serialNumber: e.serialNumber,
      manufacturerModel: e.manufacturerModel,
      criticality: e.criticality,
      foodSafetyRisk: e.foodSafetyRisk,
      ppmFrequency: e.ppmFrequency,
      serviceProvider: e.serviceProvider,
      registerStatus: e.status,
      validationStatus: e.validationStatus,
      comments: e.comments,
      latestCalibration: latest,
      status: getCalibrationStatus(latest?.dueDate ?? null),
    };
  });
}

export type EquipmentOverviewItem = Awaited<ReturnType<typeof listEquipmentCalibrationOverview>>[number];

// Groups an already-fetched overview list into Section > Area, in the
// facility's own natural layout order (the query above already orders by
// section/area sortOrder), with equipment inside each area re-sorted by
// calibration urgency -- so the page can show "separate sections" per her
// request while still surfacing overdue/due-soon items first within each.
export function groupEquipmentBySectionArea(equipment: EquipmentOverviewItem[]) {
  const sections = new Map<string, Map<string, EquipmentOverviewItem[]>>();
  for (const e of equipment) {
    if (!sections.has(e.sectionName)) sections.set(e.sectionName, new Map());
    const areas = sections.get(e.sectionName)!;
    if (!areas.has(e.areaName)) areas.set(e.areaName, []);
    areas.get(e.areaName)!.push(e);
  }
  return [...sections.entries()].map(([sectionName, areas]) => ({
    sectionName,
    areas: [...areas.entries()].map(([areaName, items]) => ({
      areaId: items[0].areaId,
      areaName,
      equipment: [...items].sort(byUrgency),
    })),
  }));
}

export async function listCalibrationHistory(equipmentId: string) {
  return db.equipmentCalibration.findMany({
    where: { equipmentId },
    include: { createdBy: { select: { name: true } } },
    orderBy: { calibratedDate: "desc" },
  });
}
