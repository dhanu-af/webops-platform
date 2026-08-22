import { formatCompactDateTimeInTimeZone } from "@/lib/timezone-format";

// "Jordan Blake — 19 Aug, 14:32" — the compact per-item audit line shown
// under a checklist row once someone has answered it. Rendered client-side,
// so `timeZone` must be passed down from the server (the facility's, not
// the viewer's own device timezone) to match the rest of the app's audit
// timestamps rather than silently disagreeing with them for anyone
// checking in from outside Australia/Brisbane.
export function formatAttribution(name: string | null, at: Date | null, timeZone: string): string | null {
  if (!name || !at) return null;
  return `${name} — ${formatCompactDateTimeInTimeZone(at, timeZone)}`;
}
