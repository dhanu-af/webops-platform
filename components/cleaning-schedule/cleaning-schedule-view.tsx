"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import data from "@/lib/data/cleaning-schedule.json";

type ScheduleRow = { area: string; daily: string; weekly: string; monthly: string; role: string };
type AgentRow = { area: string; agent: string; dilution: string; contactTime: string; notes: string };
type Zone = { key: string; name: string; title: string; zoneLine: string; schedule: ScheduleRow[]; agents: AgentRow[]; notes: string[] };

const zones = data.zones as Zone[];
type Freq = "all" | "daily" | "weekly" | "monthly";
type Section = "schedule" | "agents" | "notes";

const FREQS: Array<{ key: Freq; label: string }> = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly deep clean" },
];
const SECTIONS: Array<{ key: Section; label: string }> = [
  { key: "schedule", label: "Cleaning schedule" },
  { key: "agents", label: "Approved cleaning agents" },
  { key: "notes", label: "Notes & cross-references" },
];

const chip = (active: boolean) =>
  cn(
    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    active ? "border-accent bg-accent text-white" : "border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
  );

const matches = (q: string, ...parts: string[]) => parts.some((p) => p.toLowerCase().includes(q));
const dash = (v: string) => (v && v !== "—" ? v : "—");

function FreqBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="whitespace-pre-line text-sm text-foreground">{dash(text)}</p>
    </div>
  );
}

function ScheduleCards({ rows, freq }: { rows: ScheduleRow[]; freq: Freq }) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((r, i) => (
        <div key={i} className="rounded-[var(--radius)] border border-border bg-surface p-3.5">
          <p className="text-sm font-semibold text-foreground">{r.area}</p>
          <div className="mt-2 space-y-2">
            {(freq === "all" || freq === "daily") && <FreqBlock label="Daily" text={r.daily} />}
            {(freq === "all" || freq === "weekly") && <FreqBlock label="Weekly" text={r.weekly} />}
            {(freq === "all" || freq === "monthly") && <FreqBlock label="Monthly deep clean" text={r.monthly} />}
          </div>
          <p className="mt-2 text-xs text-muted">Responsible: <span className="text-muted-strong">{r.role || "—"}</span></p>
        </div>
      ))}
    </div>
  );
}

function ScheduleTable({ rows, freq }: { rows: ScheduleRow[]; freq: Freq }) {
  const th = "border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
  const td = "border-b border-border px-3 py-2.5 align-top whitespace-pre-line text-sm text-foreground";
  return (
    <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-border bg-surface md:block">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={cn(th, "w-[18%]")}>Area / equipment</th>
            {(freq === "all" || freq === "daily") && <th className={th}>Daily</th>}
            {(freq === "all" || freq === "weekly") && <th className={th}>Weekly</th>}
            {(freq === "all" || freq === "monthly") && <th className={th}>Monthly deep clean</th>}
            <th className={cn(th, "w-[12%]")}>Responsible</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface-sunken/60">
              <td className={cn(td, "font-medium")}>{r.area}</td>
              {(freq === "all" || freq === "daily") && <td className={td}>{dash(r.daily)}</td>}
              {(freq === "all" || freq === "weekly") && <td className={td}>{dash(r.weekly)}</td>}
              {(freq === "all" || freq === "monthly") && <td className={td}>{dash(r.monthly)}</td>}
              <td className={cn(td, "text-muted-strong")}>{r.role || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentsList({ rows }: { rows: AgentRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((a, i) => (
        <div key={i} className="rounded-[var(--radius)] border border-border bg-surface p-3.5">
          <p className="text-sm font-semibold text-foreground">{a.area}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">{a.agent}</p>
          <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-muted sm:grid-cols-3">
            <p>Dilution: <span className="text-muted-strong">{a.dilution || "—"}</span></p>
            <p>Contact time: <span className="text-muted-strong">{a.contactTime || "—"}</span></p>
            {a.notes && <p className="sm:col-span-3">Notes: <span className="whitespace-pre-line text-muted-strong">{a.notes}</span></p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CleaningScheduleView() {
  const [zoneKey, setZoneKey] = useState(zones[0].key);
  const [section, setSection] = useState<Section>("schedule");
  const [freq, setFreq] = useState<Freq>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const zone = zones.find((z) => z.key === zoneKey) ?? zones[0];

  // Search looks through every zone at once.
  const results = useMemo(() => {
    if (!q) return null;
    return zones
      .map((z) => ({
        zone: z,
        schedule: z.schedule.filter((r) => matches(q, r.area, r.daily, r.weekly, r.monthly, r.role)),
        agents: z.agents.filter((a) => matches(q, a.area, a.agent, a.dilution, a.contactTime, a.notes)),
        notes: z.notes.filter((n) => matches(q, n)),
      }))
      .filter((r) => r.schedule.length + r.agents.length + r.notes.length > 0);
  }, [q]);

  const totalHits = results?.reduce((n, r) => n + r.schedule.length + r.agents.length + r.notes.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      <details className="rounded-[var(--radius)] border border-border bg-surface">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
          Document control — {data.document.fields.find((f) => f.label === "Document Number")?.value} ·{" "}
          {data.document.fields.find((f) => f.label === "Revision")?.value}
        </summary>
        <dl className="grid gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-sm sm:grid-cols-2">
          {data.document.fields.map((f) => (
            <div key={f.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{f.label}</dt>
              <dd className="whitespace-pre-line text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      </details>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every area — e.g. kettle, hopper, IPA, scales, Contract Cleaner"
          className="w-full rounded-lg border border-border-strong bg-surface py-2.5 pl-9 pr-9 text-sm outline-none focus:border-accent"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>

      {results ? (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            {totalHits === 0 ? "Nothing matches" : `${totalHits} match${totalHits === 1 ? "" : "es"}`} for “{query.trim()}” across all areas.
          </p>
          {results.map(({ zone: z, schedule, agents, notes }) => (
            <section key={z.key} className="space-y-3">
              <button type="button" onClick={() => { setZoneKey(z.key); setQuery(""); }} className="text-sm font-semibold text-accent hover:underline">
                {z.name}
              </button>
              {schedule.length > 0 && (
                <>
                  <ScheduleCards rows={schedule} freq="all" />
                  <ScheduleTable rows={schedule} freq="all" />
                </>
              )}
              {agents.length > 0 && <AgentsList rows={agents} />}
              {notes.map((n, i) => (
                <p key={i} className="rounded-lg bg-surface-sunken px-3 py-2 text-sm text-foreground">{n}</p>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {zones.map((z) => (
              <button key={z.key} type="button" onClick={() => setZoneKey(z.key)} className={chip(z.key === zoneKey)}>
                {z.name}
              </button>
            ))}
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">{zone.name}</h2>
            <p className="text-xs text-muted">{zone.zoneLine}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SECTIONS.map((s) => (
              <button key={s.key} type="button" onClick={() => setSection(s.key)} className={chip(section === s.key)}>
                {s.label}
              </button>
            ))}
          </div>

          {section === "schedule" && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">Show:</span>
                {FREQS.map((f) => (
                  <button key={f.key} type="button" onClick={() => setFreq(f.key)} className={chip(freq === f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
              <ScheduleCards rows={zone.schedule} freq={freq} />
              <ScheduleTable rows={zone.schedule} freq={freq} />
            </>
          )}
          {section === "agents" && <AgentsList rows={zone.agents} />}
          {section === "notes" && (
            <ul className="space-y-2">
              {zone.notes.map((n, i) => (
                <li key={i} className="rounded-[var(--radius)] border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground">
                  {n}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
