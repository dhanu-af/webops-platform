import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/status";

const TONE_CLASSES: Record<StatusTone, string> = {
  pass: "bg-status-pass-soft text-status-pass",
  warn: "bg-status-warn-soft text-status-warn",
  attention: "bg-status-attention-soft text-status-attention",
  critical: "bg-status-critical-soft text-status-critical",
  neutral: "bg-status-neutral-soft text-status-neutral",
  accent: "bg-accent-soft text-accent-strong",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])} />}
      {children}
    </span>
  );
}

const DOT_CLASSES: Record<StatusTone, string> = {
  pass: "bg-status-pass",
  warn: "bg-status-warn",
  attention: "bg-status-attention",
  critical: "bg-status-critical",
  neutral: "bg-status-neutral",
  accent: "bg-accent",
};
