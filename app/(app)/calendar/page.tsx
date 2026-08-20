import Link from "next/link";
import { addMonths, format, startOfMonth } from "date-fns";
import { getCalendarMonth, getCalendarAreaOptions } from "@/lib/data/calendar";
import { calendarEntryMeta } from "@/lib/calendar-status";
import { Card, CardContent } from "@/components/ui/card";
import { MonthGrid, DOT_TONE_CLASSES } from "@/components/calendar/month-grid";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
const LEGEND_STATUSES = ["SCHEDULED", "DUE", "OVERDUE", "IN_PROGRESS", "AWAITING_SUPERVISOR", "AWAITING_QA", "CLOSED"] as const;

function parseMonth(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  return startOfMonth(new Date());
}

function monthQuery(month: Date, areaId?: string, frequency?: string) {
  const params = new URLSearchParams({ month: format(month, "yyyy-MM") });
  if (areaId) params.set("areaId", areaId);
  if (frequency) params.set("frequency", frequency);
  return `?${params.toString()}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; areaId?: string; frequency?: string }> }) {
  const params = await searchParams;
  const month = parseMonth(params.month);
  const areaId = params.areaId || undefined;
  const frequency = params.frequency || undefined;

  const [{ days }, areas] = await Promise.all([getCalendarMonth(month, { areaId, frequency }), getCalendarAreaOptions()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Ops Calendar</h1>
          <p className="text-sm text-muted">
            Daily, weekly and monthly checks by day — shift-based and ad-hoc checks don&apos;t have a fixed date and aren&apos;t shown here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={monthQuery(addMonths(month, -1), areaId, frequency)} className="flex size-8 items-center justify-center rounded-lg border border-border-strong text-muted-strong hover:bg-surface-sunken hover:text-foreground">
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-foreground">{format(month, "MMMM yyyy")}</span>
          <Link href={monthQuery(addMonths(month, 1), areaId, frequency)} className="flex size-8 items-center justify-center rounded-lg border border-border-strong text-muted-strong hover:bg-surface-sunken hover:text-foreground">
            <ChevronRight className="size-4" />
          </Link>
          <Link href={monthQuery(startOfMonth(new Date()), areaId, frequency)} className="ml-1 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-muted-strong hover:bg-surface-sunken hover:text-foreground">
            Today
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="month" value={format(month, "yyyy-MM")} />
            <div>
              <label className="text-xs font-medium text-muted-strong">Area</label>
              <select name="areaId" defaultValue={areaId ?? ""} className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent">
                <option value="">All areas</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.section.name} / {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-strong">Frequency</label>
              <select name="frequency" defaultValue={frequency ?? ""} className="mt-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent">
                <option value="">All frequencies</option>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong">
              Apply
            </button>
            {(areaId || frequency) && (
              <Link href={monthQuery(month)} className="text-sm text-muted-strong hover:text-foreground">
                Clear filters
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <MonthGrid days={days} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        {LEGEND_STATUSES.map((status) => {
          const meta = calendarEntryMeta(status);
          return (
            <span key={status} className="flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", DOT_TONE_CLASSES[meta.tone])} />
              {meta.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
