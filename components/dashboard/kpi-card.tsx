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

export function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  tone?: StatusTone;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</span>
        <Icon className="size-4 text-muted" strokeWidth={2} />
      </div>
      <div className={cn("mt-3 font-mono-tabular text-3xl font-semibold tracking-tight", TONE_TEXT[tone])}>
        {value}
        {suffix && <span className="ml-1 text-lg font-medium text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
