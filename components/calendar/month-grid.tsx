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

export function MonthGrid({ days, today }: { days: { date: Date; entries: CalendarEntry[] }[]; today: Date }) {
  if (days.length === 0) return null;

  const firstDay = days[0].date;
  const leadingBlanks = firstDay.getDay(); // 0 (Sun) - 6 (Sat)

  const cells: ({ date: Date; entries: CalendarEntry[] } | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const grid = (
    <div className="hidden overflow-hidden rounded-[var(--radius)] border border-border md:block">
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
                      {isToday && <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide">Today</span>}
                    </div>
                    <div className="space-y-1">
                      {cell.entries.map((entry) => {
                        const meta = calendarEntryMeta(entry.status);
                        const content = (
                          <div className="flex items-center gap-1.5 rounded px-1 py-0.5 pointer-coarse:py-2 text-[11px] leading-tight hover:bg-surface-sunken">
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

  // Phones: seven narrow columns cannot show a checklist name, so list the days
  // that have something scheduled instead.
  const agenda = (
    <div className="space-y-3 md:hidden">
      {days.filter((d) => d.entries.length > 0).length === 0 && (
        <p className="rounded-[var(--radius)] border border-border bg-surface px-4 py-8 text-center text-sm text-muted">Nothing scheduled this month.</p>
      )}
      {days
        .filter((d) => d.entries.length > 0)
        .map(({ date, entries }) => {
          const isToday = date.getTime() === today.getTime();
          return (
            <section key={date.getTime()} className={cn("overflow-hidden rounded-[var(--radius)] border bg-surface", isToday ? "border-accent" : "border-border")}>
              <h3 className={cn("flex items-center gap-2 border-b border-border px-3.5 py-2 text-xs font-semibold uppercase tracking-wide", isToday ? "bg-accent-soft text-accent-strong" : "bg-surface-sunken text-muted-strong")}>
                {date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
                {isToday && <span>· Today</span>}
              </h3>
              <ul className="divide-y divide-border">
                {entries.map((entry) => {
                  const meta = calendarEntryMeta(entry.status);
                  const row = (
                    <span className="flex min-h-11 items-center gap-2.5 px-3.5 py-2 text-sm">
                      <span className={cn("size-2 shrink-0 rounded-full", DOT_TONE_CLASSES[meta.tone])} />
                      <span className="min-w-0 flex-1 text-foreground">{entry.checklistName}</span>
                      <span className="shrink-0 text-xs text-muted">{meta.label}</span>
                    </span>
                  );
                  return (
                    <li key={entry.scheduleId}>
                      {entry.inspectionId ? <Link href={`/inspections/${entry.inspectionId}`}>{row}</Link> : row}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
    </div>
  );

  return (
    <>
      {agenda}
      {grid}
    </>
  );
}
