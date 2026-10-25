"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeProductionDay, setClosedWeekdays, setProductionDay } from "@/lib/actions-client/production-calendar";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type CalendarException = { id: string; date: string; type: "OPEN" | "BLOCKED"; reason: string | null };
export type UpcomingClosedDay = { date: string; label: string; opened: boolean; reason: string | null; exceptionId: string | null };

const formatDate = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function ProductionCalendarForm({
  closedWeekdays,
  exceptions,
  upcomingClosed,
  todayKey,
}: {
  closedWeekdays: number[];
  exceptions: CalendarException[];
  upcomingClosed: UpcomingClosedDay[];
  todayKey: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState<number[]>(closedWeekdays);
  const [date, setDate] = useState("");
  const [type, setType] = useState<"BLOCKED" | "OPEN">("BLOCKED");
  const [reason, setReason] = useState("");

  function run(action: () => Promise<unknown>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        after?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const weeklyChanged = [...closed].sort().join() !== [...closedWeekdays].sort().join();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground">Weekly pattern</p>
        <p className="mb-2 text-xs text-muted">Tick the days with no production. Scheduled checks are not due on those days and nobody can start a production check.</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((name, i) => (
            <label key={name} className="flex min-h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={closed.includes(i)}
                onChange={(e) => setClosed((c) => (e.target.checked ? [...c, i] : c.filter((d) => d !== i)))}
              />
              {name}
            </label>
          ))}
        </div>
        <div className="mt-2">
          <Button size="sm" disabled={pending || !weeklyChanged} onClick={() => run(() => setClosedWeekdays(closed))}>
            {pending ? "Saving…" : "Save weekly pattern"}
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Coming up (no-production days in the next 5 weeks)</p>
        <p className="mb-2 text-xs text-muted">Production on one of these days this time? Open it. It goes back to no production afterwards by itself.</p>
        {upcomingClosed.length === 0 ? (
          <p className="text-sm text-muted">No closed weekdays are set.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {upcomingClosed.map((d) => (
              <li key={d.date} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{formatDate(d.date)}</span>{" "}
                  {d.opened ? <span className="text-accent-strong">· Production day{d.reason ? ` - ${d.reason}` : ""}</span> : <span className="text-muted">· {d.label}</span>}
                  {d.date === todayKey && <span className="ml-1 text-xs font-semibold uppercase text-accent-strong">Today</span>}
                </span>
                {d.opened ? (
                  <Button size="sm" variant="secondary" disabled={pending || !d.exceptionId} onClick={() => run(() => removeProductionDay(d.exceptionId!))}>
                    Close again
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setProductionDay({ date: d.date, type: "OPEN" }))}>
                    Open for production
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Block or open a specific date</p>
        <p className="mb-2 text-xs text-muted">Block a normal production day (public holiday, shutdown), or open a normally closed day.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-strong">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 block rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-strong">This day is</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "BLOCKED" | "OPEN")}
              className="mt-1.5 block rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="BLOCKED">No production (blocked)</option>
              <option value="OPEN">A production day (opened)</option>
            </select>
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="text-xs font-medium text-muted-strong">Reason {type === "BLOCKED" ? "(required)" : "(optional)"}</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={type === "BLOCKED" ? "e.g. Public holiday" : "e.g. Rush order"}
              className="mt-1.5 block w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <Button
            size="sm"
            disabled={pending || !date || (type === "BLOCKED" && !reason.trim())}
            onClick={() =>
              run(
                () => setProductionDay({ date, type, reason }),
                () => {
                  setDate("");
                  setReason("");
                }
              )
            }
          >
            {pending ? "Saving…" : "Save day"}
          </Button>
        </div>
      </div>

      {exceptions.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Single-date changes</p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {exceptions.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{formatDate(e.date)}</span>{" "}
                  <span className={e.type === "OPEN" ? "text-accent-strong" : "text-status-warn"}>· {e.type === "OPEN" ? "Production day (opened)" : "No production (blocked)"}</span>
                  {e.reason && <span className="text-muted"> · {e.reason}</span>}
                  {e.date < todayKey && <span className="text-muted"> · past</span>}
                </span>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => removeProductionDay(e.id))}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
