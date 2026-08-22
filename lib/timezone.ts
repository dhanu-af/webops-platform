import { cache } from "react";
import { db } from "@/lib/db";

// Vercel functions run in UTC regardless of where the facility actually is
// (Queensland, in this app's case) — every "what day is it / is this due
// today" computation needs to use the facility's configured timezone
// (Facility.timezone), not the server's runtime timezone, or the app's
// idea of "today" silently disagrees with the real, physical facility for
// roughly the first ~10-14 hours of every real Brisbane day.
const FALLBACK_TIMEZONE = "Australia/Brisbane";

// Cached per request (React's cache(), not a long-lived cache) since this
// gets called from several independent data-fetching functions that can
// all run within the same render/request.
export const getFacilityTimezone = cache(async (): Promise<string> => {
  const facility = await db.facility.findFirst({ where: { archived: false }, select: { timezone: true } });
  return facility?.timezone ?? FALLBACK_TIMEZONE;
});

function zonedDateParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// How far `timeZone` is ahead of UTC at roughly the given instant, in ms.
// Recomputed from the instant itself (not hardcoded) so this stays correct
// across a DST transition for timezones that observe it.
function offsetMillisAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant.getTime();
}

// Midnight of "today" as experienced in `timeZone`, returned as the real
// UTC instant it actually is — safe to use directly in a Prisma
// `gte`/`lte` filter, unlike a Date built from the server's own local time.
export function startOfDayInTimeZone(timeZone: string, at: Date = new Date()): Date {
  const { year, month, day } = zonedDateParts(at, timeZone);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = offsetMillisAt(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

export function endOfDayInTimeZone(timeZone: string, at: Date = new Date()): Date {
  return new Date(startOfDayInTimeZone(timeZone, at).getTime() + 24 * 60 * 60 * 1000 - 1);
}

// For code (the Calendar month grid) that already builds its own sequence
// of day "labels" using plain Date math rather than real DB-range instants
// — each label is a UTC-midnight Date standing in for a calendar day, which
// only works as a shared vocabulary when every label uses the same
// encoding. This returns today's Y/M/D in `timeZone`, encoded the same way,
// so it can be compared with `===`/`<`/`>` against those labels directly.
export function todayLabelInTimeZone(timeZone: string, at: Date = new Date()): Date {
  const { year, month, day } = zonedDateParts(at, timeZone);
  return new Date(Date.UTC(year, month - 1, day));
}

// "yyyy-MM-dd" as perceived in `timeZone` — for feeding a real UTC instant
// (e.g. the `from`/`to` this file already computed) back into a plain
// `<input type="date">` default value. date-fns' own format() reads a
// Date's *server-local* fields, which on a UTC server would print the
// wrong day for an instant like Brisbane midnight (UTC 14:00 the day
// before) — this reads the fields through the same timezone instead.
export function formatDateInTimeZone(at: Date, timeZone: string): string {
  const { year, month, day } = zonedDateParts(at, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "yyyy-MM-dd HH:mm" as perceived in `timeZone` — the sortable/machine-
// readable timestamp format for CSV exports, same underlying fix as
// formatDateInTimeZone above (a raw date-fns format() prints the server's
// UTC fields, not the facility's).
export function formatDateTimeIsoInTimeZone(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// Human-readable timestamps for *server*-rendered pages (audit trail,
// reports table, checklist version history, evidence gallery) — a client
// component reading the viewer's own device clock doesn't have this
// problem (that's already the viewer's local time), but anything rendered
// server-side via plain date-fns format() prints the server's UTC time,
// not the facility's, unless routed through here.
export function formatDateTimeInTimeZone(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}`;
}

export function formatDayInTimeZone(at: Date, timeZone: string, withYear = true): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return withYear ? `${get("day")} ${get("month")} ${get("year")}` : `${get("day")} ${get("month")}`;
}
