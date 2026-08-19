import { getSchedulesByCategory } from "@/lib/data/by-category";
import { ScheduleList } from "@/components/inspection/schedule-list";

export default async function PreStartPage() {
  const schedules = await getSchedulesByCategory("PRE_START");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Pre-Start</h1>
        <p className="text-sm text-muted">Scan → Select → Check → Photo → Submit.</p>
      </div>
      <ScheduleList schedules={schedules} emptyLabel="No pre-start checklists scheduled yet." />
    </div>
  );
}
