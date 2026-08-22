"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OpsTrendPoint } from "@/lib/data/dashboard";

const PERIODS: { key: "today" | "week" | "month"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const SERIES = [
  { key: "completed" as const, name: "Completed", color: "var(--accent)" },
  { key: "inProgress" as const, name: "In Progress", color: "var(--status-warn)" },
  { key: "pending" as const, name: "Pending", color: "var(--status-neutral)" },
];

function ChartTooltip({ active, payload, label }: Partial<TooltipContentProps<ValueType, NameType>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-xs shadow-[0_4px_16px_rgba(16,20,28,0.12)]">
      {label !== undefined && <p className="mb-1 font-medium text-muted-strong">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((p) => (
          <p key={String(p.dataKey)} className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="font-mono-tabular font-semibold text-foreground">{p.value}</span>
            <span className="text-muted">{p.name}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function OperationsOverviewChart({ data }: { data: { today: OpsTrendPoint[]; week: OpsTrendPoint[]; month: OpsTrendPoint[] } }) {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const points = data[period];
  const hasActivity = points.some((p) => p.completed + p.inProgress + p.pending > 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Operations Overview</CardTitle>
          <CardDescription>Completed, in progress, and pending checks over time</CardDescription>
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
      <CardContent>
        {!hasActivity ? (
          <p className="flex h-[260px] items-center justify-center text-sm text-muted">
            No operations recorded for this period yet.
          </p>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} maxBarSize={period === "today" ? 14 : 28}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  interval={period === "month" ? "preserveStartEnd" : 0}
                />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-sunken)" }} />
                {SERIES.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    stackId="ops"
                    fill={s.color}
                    radius={i === SERIES.length - 1 ? [3, 3, 0, 0] : undefined}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
