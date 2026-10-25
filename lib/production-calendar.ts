// Which days are production days. Pure rules, no database: the data layer is lib/production-calendar-data.ts.
//
// The weekly pattern closes some weekdays (default Saturday and Sunday). A single-date exception then
// either BLOCKS a normal production day (holiday, shutdown) or OPENS a normally closed day (a Saturday shift).
export type ExceptionType = "BLOCKED" | "OPEN";
export type ProductionException = { date: string; type: ExceptionType; reason: string | null };
export type ProductionCalendarConfig = { closedWeekdays: number[]; exceptions: ProductionException[] };

export const DEFAULT_CLOSED_WEEKDAYS = [0, 6];
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type ProductionDay = {
  production: boolean;
  /** NORMAL: open weekday. WEEKDAY_CLOSED: closed by the weekly pattern. BLOCKED / OPENED: a single-date exception. */
  reason: "NORMAL" | "WEEKDAY_CLOSED" | "BLOCKED" | "OPENED";
  weekday: number;
  note: string | null;
};

/** yyyy-mm-dd of a calendar-day label (a Date built as UTC midnight of the facility-local day). */
export function dateKey(label: Date): string {
  return label.toISOString().slice(0, 10);
}

export function productionDayInfo(label: Date, config: ProductionCalendarConfig): ProductionDay {
  const weekday = label.getUTCDay();
  const exception = config.exceptions.find((e) => e.date === dateKey(label));
  if (exception?.type === "OPEN") return { production: true, reason: "OPENED", weekday, note: exception.reason };
  if (exception?.type === "BLOCKED") return { production: false, reason: "BLOCKED", weekday, note: exception.reason };
  if (config.closedWeekdays.includes(weekday)) return { production: false, reason: "WEEKDAY_CLOSED", weekday, note: null };
  return { production: true, reason: "NORMAL", weekday, note: null };
}

/** Short wording for a closed day, e.g. "Sunday - no production" or "No production - Public holiday". */
export function describeNoProduction(info: ProductionDay): string {
  if (info.reason === "BLOCKED") return info.note ? `No production - ${info.note}` : "No production (blocked day)";
  return `${WEEKDAY_NAMES[info.weekday]} - no production`;
}
