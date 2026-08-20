import Link from "next/link";
import { cn } from "@/lib/utils";
import { calendarEntryMeta } from "@/lib/calendar-status";
import type { CalendarEntry } from "@/lib/data/calendar";

export const DOT_TONE_CLASSES: Record<string, string> = {
  pass: "bg-status-pass",
  warn: "bg-status-warn",
  attention: "bg-status-attention",
  critical: "bg-status-critical",
  neutral: "bg-status-neutral",
  accent: "bg-accent",
};

export function MonthGrid({ days }: { days: { date: Date; entries: CalendarEntry[] }[] }) {
  if (days.length === 0) return null;

  const firstDay = days[0].date;
  const leadingBlanks = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: ({ date: Date; entries: CalendarEntry[] } | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-3 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.map((week, wi) =>
          week.map((cell, di) => {
            const isToday = cell && cell.date.getTime() === today.getTime();
            return (
              <div
                key={`${wi}-${di}`}
                className={cn(
                  "min-h-[110px] border-b border-r border-border p-2 last:border-r-0",
                  di === 6 && "border-r-0",
                  !cell && "bg-surface-sunken/40"
                )}
              >
                {cell && (
                  <>
                    <div className={cn("mb-1.5 text-xs font-medium", isToday ? "text-accent-strong" : "text-muted-strong")}>
                      {cell.date.getDate()}
                      {isToday && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide">Today</span>}
                    </div>
                    <div className="space-y-1">
                      {cell.entries.map((entry) => {
                        const meta = calendarEntryMeta(entry.status);
                        const content = (
                          <div className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-surface-sunken">
                            <span className={cn("size-1.5 shrink-0 rounded-full", DOT_TONE_CLASSES[meta.tone])} />
                            <span className="truncate text-foreground">{entry.checklistName}</span>
                          </div>
                        );
                        return entry.inspectionId ? (
                          <Link key={entry.scheduleId} href={`/inspections/${entry.inspectionId}`} title={`${entry.checklistName} — ${meta.label}`}>
                            {content}
                          </Link>
                        ) : (
                          <div key={entry.scheduleId} title={`${entry.checklistName} — ${meta.label}`}>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
