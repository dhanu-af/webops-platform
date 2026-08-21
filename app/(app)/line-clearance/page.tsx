import { getSchedulesByCategory } from "@/lib/data/by-category";
import { ScheduleList } from "@/components/inspection/schedule-list";

export default async function LineClearancePage() {
  const schedules = await getSchedulesByCategory("LINE_CLEARANCE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Line Clearance</h1>
        <p className="text-sm text-muted">Scan → Select → Check → Photo → Submit.</p>
      </div>
      <ScheduleList schedules={schedules} emptyLabel="No line clearance checklists scheduled yet." />
    </div>
  );
}
