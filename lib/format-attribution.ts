import { format } from "date-fns";

// "Jordan Blake — 19 Aug, 14:32" — the compact per-item audit line shown
// under a checklist row once someone has answered it.
export function formatAttribution(name: string | null, at: Date | null): string | null {
  if (!name || !at) return null;
  return `${name} — ${format(at, "d MMM, HH:mm")}`;
}
