// Pure Intl-based formatting only — no `@/lib/db` import, unlike
// `lib/timezone.ts`. Client Components can safely import from here; if this
// file ever imports `lib/db` (even unused), bundlers can't tree-shake the
// module's side effects and will drag the Node-only `pg` driver into the
// browser bundle.

// "19 Aug, 14:32" — no year, for the compact per-checklist-item attribution
// line where space is tight and the year is always the current one.
export function formatCompactDateTimeInTimeZone(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")}, ${get("hour")}:${get("minute")}`;
}
