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

const TONE_BAR: Record<StatusTone, string> = {
  pass: "bg-status-pass",
  warn: "bg-status-warn",
  attention: "bg-status-attention",
  critical: "bg-status-critical",
  neutral: "bg-border-strong",
  accent: "bg-accent",
};

export function KpiCard({
  label,
  value,
  suffix,
  helpText,
  icon: Icon,
  tone = "neutral",
  progress,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  helpText?: string;
  icon: LucideIcon;
  tone?: StatusTone;
  /** 0–100. When provided, renders a thin progress indicator under the number. */
  progress?: number;
}) {
  return (
    <div className="group flex h-full flex-col rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-xs)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          {label}
        </span>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            TONE_ICON_BG[tone],
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.25} />
        </span>
      </div>
      <div
        className={cn(
          "mt-3 font-mono-tabular text-[28px] font-semibold leading-none tracking-tight",
          TONE_TEXT[tone],
        )}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-base font-medium text-muted">
            {suffix}
          </span>
        )}
      </div>
      {helpText && <p className="mt-1.5 text-xs text-muted">{helpText}</p>}
      {typeof progress === "number" && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              TONE_BAR[tone],
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
