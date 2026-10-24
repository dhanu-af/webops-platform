import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getSchedulesByCategory } from "@/lib/data/by-category";
import { ScheduleList } from "@/components/inspection/schedule-list";
import { OnDemandChecklists } from "@/components/inspection/on-demand-checklists";

export default async function LineClearancePage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const schedules = await getSchedulesByCategory("LINE_CLEARANCE", scope);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Line Clearance</h1>
        <p className="text-sm text-muted">Scan → Select → Check → Photo → Submit.</p>
      </div>
      <ScheduleList schedules={schedules} emptyLabel="No line clearance checklists scheduled yet." />
      <OnDemandChecklists category="LINE_CLEARANCE" />
    </div>
  );
}
