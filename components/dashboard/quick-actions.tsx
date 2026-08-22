import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck2, Wrench, ClipboardX, ClipboardCheck, Images, Gauge, type LucideIcon } from "lucide-react";

const ACTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "New Inspection", href: "/today", icon: CalendarCheck2 },
  { label: "Corrective Action", href: "/corrective-actions", icon: Wrench },
  { label: "Line Clearance", href: "/line-clearance", icon: ClipboardX },
  { label: "Pre-Start Check", href: "/pre-start", icon: ClipboardCheck },
  { label: "Upload Evidence", href: "/evidence", icon: Images },
  { label: "Record Calibration", href: "/calibration", icon: Gauge },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {ACTIONS.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-start gap-2.5 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-foreground shadow-[var(--shadow-xs)] transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow-sm)]"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                <a.icon className="size-4" strokeWidth={2.25} />
              </span>
              {a.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
