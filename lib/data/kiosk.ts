import { db } from "@/lib/db";

import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone, todayLabelInTimeZone } from "@/lib/timezone";
import { scheduleAppliesOnDay } from "@/lib/schedule-recurrence";
import { isFacilityLevelCategory } from "@/lib/inspection-rules";
import { getTodayProductionDay } from "@/lib/production-calendar-data";

/** Every document (checklist) that can be opened on the shop floor, for choosing one by hand when a tag is missing. */
export async function listKioskDocuments() {
    return db.checklist.findMany({
      where: { active: true, versions: { some: { isCurrent: true } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
}

/** Every area and its machines, for choosing a machine by hand when a tag is missing or damaged. */
export async function listKioskPlaces() {
  const areas = await db.area.findMany({
    where: { archived: false },
    select: {
      id: true,
      name: true,
      section: { select: { name: true } },
      equipment: { where: { archived: false }, select: { id: true, name: true, code: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
    orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  return areas.map((a) => ({ id: a.id, name: a.name, section: a.section.name, equipment: a.equipment }));
}

/** Resolves the unguessable tag printed on a machine or area to the thing it stands for. */
export async function resolveKioskTag(token: string): Promise<{ kind: "e" | "a" | "c"; id: string } | null> {
  const [equipment, area, checklist] = await Promise.all([
    db.equipment.findUnique({ where: { qrToken: token }, select: { id: true, archived: true } }),
    db.area.findUnique({ where: { qrToken: token }, select: { id: true, archived: true } }),
    db.checklist.findUnique({ where: { qrToken: token }, select: { id: true, active: true } }),
  ]);
  if (equipment && !equipment.archived) return { kind: "e", id: equipment.id };
  if (area && !area.archived) return { kind: "a", id: area.id };
  if (checklist && checklist.active) return { kind: "c", id: checklist.id };
  return null;
}

/** A document (checklist) with the places it is scheduled for, so its tag opens it straight away. */
export async function getKioskChecklist(id: string) {
  const checklist = await db.checklist.findUnique({
    where: { id },
    select: { id: true, name: true, category: true, active: true, versions: { where: { isCurrent: true }, take: 1, select: { id: true } } },
  });
  if (!checklist || !checklist.active || checklist.versions.length === 0) return null;

  const now = new Date();
  const timeZone = await getFacilityTimezone();
  const [production, schedules, areas] = await Promise.all([
    getTodayProductionDay(),
    db.checklistSchedule.findMany({
      where: { checklistId: id, active: true, startDate: { lte: now } },
      include: {
        area: { select: { name: true } },
        equipment: { select: { name: true } },
        facility: { select: { name: true } },
        inspections: { where: { createdAt: { gte: startOfDayInTimeZone(timeZone, now), lte: endOfDayInTimeZone(timeZone, now) } }, take: 1, select: { id: true, status: true } },
      },
      orderBy: [{ dueTime: "asc" }],
    }),
    // places to start it from when it has no schedule (a one-off document)
    db.area.findMany({ where: { archived: false }, select: { id: true, name: true, section: { select: { name: true } } }, orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
  ]);

  const facilityLevel = isFacilityLevelCategory(checklist.category);
  return {
    id: checklist.id,
    name: checklist.name,
    production,
    closed: !production.production && !facilityLevel,
    schedules: schedules.map((s) => ({
      id: s.id,
      // which place this row is for: the machine, else the area, else the whole facility
      checklistName: s.equipment?.name ?? s.area?.name ?? s.facility.name,
      frequency: s.frequency,
      dueTime: s.dueTime,
      inspection: s.inspections[0] ?? null,
    })),
    areas: areas.map((a) => ({ id: a.id, label: `${a.name} · ${a.section.name}` })),
    facilityLevel,
  };
}

/** A machine (kind "e") or an area (kind "a") with the checks due there today. */
export async function getKioskTarget(kind: "e" | "a", id: string) {
  let equipment: { id: string; name: string; code: string } | null = null;
  let areaId: string;
  if (kind === "e") {
    const row = await db.equipment.findUnique({ where: { id }, select: { id: true, name: true, code: true, archived: true, areaId: true } });
    if (!row || row.archived) return null;
    equipment = { id: row.id, name: row.name, code: row.code };
    areaId = row.areaId;
  } else {
    areaId = id;
  }
  const area = await db.area.findUnique({
    where: { id: areaId },
    select: {
      id: true,
      name: true,
      archived: true,
      section: { select: { name: true } },
      equipment: { where: { archived: false }, select: { id: true, name: true, code: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });
  if (!area || area.archived) return null;

  const now = new Date();
  const timeZone = await getFacilityTimezone();
  const today = todayLabelInTimeZone(timeZone, now);
  const [production, schedules] = await Promise.all([
    getTodayProductionDay(),
    db.checklistSchedule.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        areaId: area.id,
        OR: equipment ? [{ equipmentId: null }, { equipmentId: equipment.id }] : [{ equipmentId: null }],
      },
      include: {
        checklist: { select: { name: true, category: true } },
        inspections: { where: { createdAt: { gte: startOfDayInTimeZone(timeZone, now), lte: endOfDayInTimeZone(timeZone, now) } }, take: 1, select: { id: true, status: true } },
      },
      orderBy: [{ dueTime: "asc" }],
    }),
  ]);

  const due = schedules.filter((s) => scheduleAppliesOnDay(s, today) && (production.production || isFacilityLevelCategory(s.checklist.category)));
  return {
    title: equipment ? equipment.name : area.name,
    code: equipment?.code ?? null,
    areaName: area.name,
    sectionName: area.section.name,
    machines: equipment ? [] : area.equipment,
    schedules: due.map((s) => ({
      id: s.id,
      checklistName: s.checklist.name,
      frequency: s.frequency,
      dueTime: s.dueTime,
      inspection: s.inspections[0] ?? null,
    })),
    production,
  };
}
