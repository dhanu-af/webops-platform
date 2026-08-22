"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import type { FiveSPeriod } from "@/lib/data/five-s";

const PERIODS: { key: "daily" | "weekly" | "monthly"; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const RANK_BAR: Record<number, string> = {
  0: "bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]",
  1: "bg-status-pass",
  2: "bg-status-attention",
};

const RANK_BADGE: Record<number, string> = {
  0: "bg-accent-soft text-accent-strong ring-accent/20",
  1: "bg-status-pass-soft text-status-pass ring-status-pass/15",
  2: "bg-status-attention-soft text-status-attention ring-status-attention/15",
};

export function FiveSLeaderboard({ data }: { data: { daily: FiveSPeriod; weekly: FiveSPeriod; monthly: FiveSPeriod } }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const current = data[period];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-accent-strong" />
            Best 5S Section
          </CardTitle>
          <CardDescription>{current.label}</CardDescription>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full border border-border-strong bg-surface-sunken p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
                period === p.key
                  ? "bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] text-accent-foreground shadow-[var(--shadow-xs)]"
                  : "text-muted-strong hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {current.entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No 5S checks recorded for this period yet.</p>
        ) : (
          <div className="space-y-3">
            {current.entries.map((entry, i) => (
              <div key={entry.areaId} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-16 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                    RANK_BADGE[i] ?? "bg-surface-sunken text-muted-strong ring-border-strong"
                  )}
                >
                  No. {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{entry.areaName}</span>
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted">{entry.sectionName}</span>
                    </div>
                    <span className="shrink-0 font-mono-tabular text-sm font-semibold text-foreground">{entry.score}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-500", RANK_BAR[i] ?? "bg-border-strong")}
                      style={{ width: `${Math.min(100, Math.max(0, entry.score))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
