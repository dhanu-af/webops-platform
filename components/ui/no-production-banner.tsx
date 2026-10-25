import { CalendarOff } from "lucide-react";
import { describeNoProduction } from "@/lib/production-calendar";
import { getTodayProductionDay } from "@/lib/production-calendar-data";

// A slim strip across the top of every page on a no-production day, so nobody wonders why nothing is due.
export async function NoProductionBanner() {
  const today = await getTodayProductionDay();
  if (today.production) return null;
  return (
    <div role="status" className="mb-4 flex items-start gap-2.5 rounded-[var(--radius)] border border-status-warn/30 bg-status-warn-soft px-4 py-2.5 text-sm text-status-warn">
      <CalendarOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">{describeNoProduction(today)} today.</span> Scheduled production checks are not due, and a production check cannot be started. Facility checks such as the generator still can.
        If work is going ahead, an admin can open today in Settings.
      </p>
    </div>
  );
}
