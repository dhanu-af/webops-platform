import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/status";

const TONE_CLASSES: Record<StatusTone, string> = {
  pass: "bg-status-pass-soft text-status-pass ring-status-pass/15",
  warn: "bg-status-warn-soft text-status-warn ring-status-warn/15",
  attention:
    "bg-status-attention-soft text-status-attention ring-status-attention/15",
  critical:
    "bg-status-critical-soft text-status-critical ring-status-critical/15",
  neutral: "bg-status-neutral-soft text-status-neutral ring-status-neutral/15",
  accent: "bg-accent-soft text-accent-strong ring-accent/15",
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
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium tracking-wide ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])} />
      )}
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
