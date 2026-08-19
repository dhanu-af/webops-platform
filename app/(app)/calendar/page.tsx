import { ComingSoon } from "@/components/ui/coming-soon";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Ops Calendar</h1>
        <p className="text-sm text-muted">Daily, weekly, monthly and ad-hoc checks in one view.</p>
      </div>
      <ComingSoon icon={CalendarDays} title="Calendar view in progress" description="Due, completed, overdue and awaiting-verification checks will plot here by day, week and month, filterable by area and checklist type." />
    </div>
  );
}
