// Deliberately zero DB import (unlike lib/timezone.ts, which pulls in
// lib/db.ts for getFacilityTimezone) so the client-side FacilityClock can
// import it directly -- see the "use client" import-chain gotcha in
// HANDOVER.md's Key decisions.
export function facilityClockParts(timeZone: string, at: Date = new Date()): { date: string; time: string } {
  const date = at.toLocaleDateString("en-AU", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = at.toLocaleTimeString("en-AU", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return { date, time };
}

// Dashboard greeting header -- "Good morning/afternoon/evening" based on the
// facility's local hour, not the server's.
export function greetingPrefix(timeZone: string, at: Date = new Date()): string {
  const hour = Number(at.toLocaleString("en-US", { timeZone, hour: "numeric", hour12: false }));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
