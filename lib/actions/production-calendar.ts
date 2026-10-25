"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { db } from "@/lib/db";
import { requireLiveUser } from "@/lib/session-user";
import { logAudit } from "@/lib/audit";
import { revalidatePath, updateTag } from "next/cache";
import { PRODUCTION_CALENDAR_TAG } from "@/lib/cached-config";
import { productionDayInfo, WEEKDAY_NAMES } from "@/lib/production-calendar";

// Production calendar: which weekdays are closed, and single dates opened or blocked. Same tier as the other
// facility-wide settings. Every change is audited with what it was before.
async function requireCalendarManager() {
  return requireLiveUser("areas.manage");
}

function refreshEverywhere() {
  updateTag(PRODUCTION_CALENDAR_TAG);
  for (const path of ["/admin/settings", "/today", "/dashboard", "/calendar"]) revalidatePath(path);
  revalidatePath("/", "layout");
}

async function getOrCreateSettings() {
  return (await db.systemSettings.findFirst()) ?? (await db.systemSettings.create({ data: {} }));
}

async function setClosedWeekdays__impl(days: number[]) {
  const actor = await requireCalendarManager();
  if (!Array.isArray(days) || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw new UserFacingError("Choose weekdays from Sunday to Saturday.");
  const closedWeekdays = [...new Set(days)].sort();
  if (closedWeekdays.length === 7) throw new UserFacingError("At least one weekday must be a production day.");

  const settings = await getOrCreateSettings();
  const before = [...settings.closedWeekdays].sort();
  if (before.join() === closedWeekdays.join()) return;

  await db.$transaction(async (tx) => {
    await tx.systemSettings.update({ where: { id: settings.id }, data: { closedWeekdays } });
    await logAudit(
      {
        entityType: "ProductionCalendar",
        entityId: settings.id,
        action: "EDITED",
        userId: actor.id,
        fieldName: "closedWeekdays",
        oldValue: { closed: before.map((d) => WEEKDAY_NAMES[d]) },
        newValue: { closed: closedWeekdays.map((d) => WEEKDAY_NAMES[d]) },
        reason: `No-production weekdays: ${closedWeekdays.length ? closedWeekdays.map((d) => WEEKDAY_NAMES[d]).join(", ") : "none"}`,
      },
      tx
    );
  });
  refreshEverywhere();
}

async function setProductionDay__impl(input: { date: string; type: "OPEN" | "BLOCKED"; reason?: string }) {
  const actor = await requireCalendarManager();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new UserFacingError("Choose a date.");
  const date = new Date(`${input.date}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.date) throw new UserFacingError("That is not a real date.");
  if (input.type !== "OPEN" && input.type !== "BLOCKED") throw new UserFacingError("Choose whether the day is open or blocked.");
  const reason = input.reason?.trim() || null;
  if (input.type === "BLOCKED" && !reason) throw new UserFacingError("Give a reason for blocking this day (for example, a public holiday).");

  // An exception that matches what the weekly pattern already says does nothing, so say so.
  const settings = await getOrCreateSettings();
  const normal = productionDayInfo(date, { closedWeekdays: settings.closedWeekdays, exceptions: [] });
  if (input.type === "OPEN" && normal.production) throw new UserFacingError("That day is already a production day.");
  if (input.type === "BLOCKED" && !normal.production) throw new UserFacingError(`That day is already a no-production day (${WEEKDAY_NAMES[normal.weekday]}).`);

  const before = await db.productionDayException.findUnique({ where: { date } });
  await db.$transaction(async (tx) => {
    const row = await tx.productionDayException.upsert({
      where: { date },
      create: { date, type: input.type, reason, createdById: actor.id },
      update: { type: input.type, reason, createdById: actor.id },
    });
    await logAudit(
      {
        entityType: "ProductionCalendar",
        entityId: row.id,
        action: before ? "EDITED" : "CREATED",
        userId: actor.id,
        fieldName: input.date,
        oldValue: before ? { type: before.type, reason: before.reason } : undefined,
        newValue: { type: input.type, reason },
        reason: `${input.date}: ${input.type === "OPEN" ? "production day (opened)" : "no production (blocked)"}${reason ? ` - ${reason}` : ""}`,
      },
      tx
    );
  });
  refreshEverywhere();
}

async function removeProductionDay__impl(id: string) {
  const actor = await requireCalendarManager();
  const row = await db.productionDayException.findUniqueOrThrow({ where: { id } });
  const key = row.date.toISOString().slice(0, 10);
  await db.$transaction(async (tx) => {
    await tx.productionDayException.delete({ where: { id } });
    await logAudit(
      {
        entityType: "ProductionCalendar",
        entityId: id,
        action: "DELETED",
        userId: actor.id,
        fieldName: key,
        oldValue: { type: row.type, reason: row.reason },
        reason: `${key}: exception removed, the normal weekly pattern applies again`,
      },
      tx
    );
  });
  refreshEverywhere();
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function setClosedWeekdays(...args: Parameters<typeof setClosedWeekdays__impl>) {
  return guard(() => setClosedWeekdays__impl(...args));
}

export async function setProductionDay(...args: Parameters<typeof setProductionDay__impl>) {
  return guard(() => setProductionDay__impl(...args));
}

export async function removeProductionDay(...args: Parameters<typeof removeProductionDay__impl>) {
  return guard(() => removeProductionDay__impl(...args));
}
