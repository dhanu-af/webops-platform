import type { StatusTone } from "@/lib/status";
import { INSPECTION_STATUS_META } from "@/lib/status";
import type { CalendarEntry } from "@/lib/data/calendar";

const EXTRA_META: Record<"SCHEDULED" | "DUE" | "OVERDUE", { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: "Scheduled", tone: "neutral" },
  DUE: { label: "Due Today", tone: "accent" },
  OVERDUE: { label: "Overdue", tone: "critical" },
};

export function calendarEntryMeta(status: CalendarEntry["status"]): { label: string; tone: StatusTone } {
  return EXTRA_META[status as keyof typeof EXTRA_META] ?? INSPECTION_STATUS_META[status];
}
