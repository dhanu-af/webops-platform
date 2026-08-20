"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  type TooltipContentProps,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import type { ReactNode } from "react";
import type { ScoreTrendPoint, AreaPerformancePoint, FindingsByAreaPoint, AgingBucket } from "@/lib/data/analytics";

const TONE_VAR: Record<AgingBucket["tone"], string> = {
  pass: "var(--status-pass)",
  warn: "var(--status-warn)",
  attention: "var(--status-attention)",
  critical: "var(--status-critical)",
};

function ChartTooltip({ active, payload, label }: Partial<TooltipContentProps<ValueType, NameType>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-xs shadow-[0_4px_16px_rgba(16,20,28,0.12)]">
      {label !== undefined && <p className="mb-1 font-medium text-muted-strong">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((p) => (
          <p key={String(p.dataKey)} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="font-mono-tabular font-semibold text-foreground">{p.value}</span>
            <span className="text-muted">{p.name}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="flex h-full min-h-[220px] items-center justify-center text-sm text-muted">{message}</p>;
}

export function ScoreTrendChart({ data }: { data: ScoreTrendPoint[] }) {
  if (data.every((d) => d.avgScore === null)) return <EmptyState message="No scored inspections in this range." />;
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="avgScore"
            name="Avg score"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaPerformanceChart({ data }: { data: AreaPerformancePoint[] }) {
  if (data.length === 0) return <EmptyState message="No scored inspections in this range." />;
  const height = Math.max(160, data.length * 40);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }} maxBarSize={20}>
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-strong)", fontSize: 12 }} axisLine={false} tickLine={false} width={140} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-sunken)" }} />
          <Bar dataKey="avgScore" name="Avg score" fill="var(--accent)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="avgScore" position="right" formatter={(v: ReactNode) => `${v}%`} fill="var(--muted-strong)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const SEVERITY_LEGEND = [
  { key: "CRITICAL" as const, label: "Critical", tone: "critical" as const },
  { key: "MAJOR" as const, label: "Major", tone: "attention" as const },
  { key: "MINOR" as const, label: "Minor", tone: "warn" as const },
];

export function FindingsBySeverityChart({ data }: { data: FindingsByAreaPoint[] }) {
  if (data.length === 0) return <EmptyState message="No findings recorded in this range." />;
  const height = Math.max(160, data.length * 44);
  return (
    <div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} maxBarSize={20}>
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-strong)", fontSize: 12 }} axisLine={false} tickLine={false} width={140} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-sunken)" }} />
            {SEVERITY_LEGEND.map(({ key, label, tone }) => (
              <Bar key={key} dataKey={key} name={label} stackId="severity" fill={TONE_VAR[tone]} radius={key === "MINOR" ? [0, 4, 4, 0] : undefined} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        {SEVERITY_LEGEND.map(({ key, label, tone }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: TONE_VAR[tone] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CorrectiveActionAgingChart({ data }: { data: AgingBucket[] }) {
  const total = data.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) return <EmptyState message="No open corrective actions." />;
  return (
    <div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 8, left: -12, bottom: 0 }} maxBarSize={40}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-sunken)" }} />
            <Bar dataKey="count" name="Open corrective actions" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="count" position="top" fill="var(--muted-strong)" fontSize={12} />
              {data.map((entry, i) => (
                <Cell key={i} fill={TONE_VAR[entry.tone]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: TONE_VAR.pass }} />
          Healthy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: TONE_VAR.warn }} />
          Ageing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: TONE_VAR.attention }} />
          Stale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: TONE_VAR.critical }} />
          Overdue risk
        </span>
      </div>
    </div>
  );
}
