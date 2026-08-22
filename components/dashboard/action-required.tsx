import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/status";

type ActionItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: StatusTone;
  href: string;
};

const TONE_ICON_BG: Record<StatusTone, string> = {
  critical: "bg-status-critical-soft text-status-critical",
  attention: "bg-status-attention-soft text-status-attention",
  warn: "bg-status-warn-soft text-status-warn",
  pass: "bg-status-pass-soft text-status-pass",
  neutral: "bg-surface-sunken text-muted-strong",
  accent: "bg-accent-soft text-accent-strong",
};

export function ActionRequired({ items }: { items: ActionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Action Required</CardTitle>
          <CardDescription>What needs attention right now</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <div className="flex items-center gap-2.5 py-6 text-sm text-muted">
            <CheckCircle2 className="size-4 text-status-pass" />
            Nothing outstanding — every item is on track.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.title} className="flex items-center gap-3.5 py-3.5">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE_ICON_BG[item.tone])}>
                  <item.icon className="size-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                </div>
                <Link href={item.href} className="shrink-0 text-sm font-medium text-accent hover:text-accent-strong">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { ActionItem };
