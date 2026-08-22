import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { StatusTone } from "@/lib/status";

const TONE_TEXT: Record<StatusTone, string> = {
  pass: "text-status-pass",
  warn: "text-status-warn",
  attention: "text-status-attention",
  critical: "text-status-critical",
  neutral: "text-foreground",
  accent: "text-accent-strong",
};

const TONE_ICON_BG: Record<StatusTone, string> = {
  pass: "bg-status-pass-soft text-status-pass",
  warn: "bg-status-warn-soft text-status-warn",
  attention: "bg-status-attention-soft text-status-attention",
  critical: "bg-status-critical-soft text-status-critical",
  neutral: "bg-surface-sunken text-muted-strong",
  accent: "bg-accent-soft text-accent-strong",
};

const TONE_DOT: Record<StatusTone, string> = {
  pass: "bg-status-pass",
  warn: "bg-status-warn",
  attention: "bg-status-attention",
  critical: "bg-status-critical",
  neutral: "bg-border-strong",
  accent: "bg-accent",
};

export type SummaryStat = { label: string; value: string | number; tone?: StatusTone };

// The dashboard's top-row KPI cards each summarize a whole domain (today's
// operations, inspections, corrective actions, equipment, compliance) as one
// hero number plus a couple of supporting stats, rather than KpiCard's
// single-metric design (still used elsewhere, e.g. the 5S Score tile) --
// same visual language (border/shadow/radius/hover-lift), richer content.
export function SummaryCard({
  label,
  icon: Icon,
  tone = "neutral",
  primaryValue,
  primarySuffix,
  primaryLabel,
  stats,
}: {
  label: string;
  icon: LucideIcon;
  tone?: StatusTone;
  primaryValue: string | number;
  primarySuffix?: string;
  primaryLabel: string;
  stats: SummaryStat[];
}) {
  return (
    <div className="flex h-full flex-col rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-xs)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{label}</span>
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", TONE_ICON_BG[tone])}>
          <Icon className="size-3.5" strokeWidth={2.25} />
        </span>
      </div>

      <div className={cn("mt-3 font-mono-tabular text-[28px] font-semibold leading-none tracking-tight", TONE_TEXT[tone])}>
        {primaryValue}
        {primarySuffix && <span className="ml-1 text-base font-medium text-muted">{primarySuffix}</span>}
      </div>
      <p className="mt-1.5 text-xs text-muted">{primaryLabel}</p>

      <div className="mt-auto flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-border/70 pt-3">
        {stats.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted-strong">
            <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[s.tone ?? "neutral"])} />
            <span className="font-mono-tabular font-semibold text-foreground">{s.value}</span>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
