import { db } from "@/lib/db";
import { PIN_ROLES } from "@/lib/pin";
import { getFacilityTimezone, startOfDayInTimeZone, endOfDayInTimeZone, todayLabelInTimeZone } from "@/lib/timezone";
import { scheduleAppliesOnDay } from "@/lib/schedule-recurrence";
import { isFacilityLevelCategory } from "@/lib/inspection-rules";
import { getTodayProductionDay } from "@/lib/production-calendar-data";

/** People who can pick their name on a shop-floor iPad: active operators / team leaders who have a PIN. Names only. */
export async function listKioskPeople() {
  return db.user.findMany({
    where: { active: true, role: { in: [...PIN_ROLES] }, pinHash: { not: null } },
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
export async function resolveKioskTag(token: string): Promise<{ kind: "e" | "a"; id: string } | null> {
  const [equipment, area] = await Promise.all([
    db.equipment.findUnique({ where: { qrToken: token }, select: { id: true, archived: true } }),
    db.area.findUnique({ where: { qrToken: token }, select: { id: true, archived: true } }),
  ]);
  if (equipment && !equipment.archived) return { kind: "e", id: equipment.id };
  if (area && !area.archived) return { kind: "a", id: area.id };
  return null;
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
