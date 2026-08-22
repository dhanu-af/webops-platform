import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getTodaySchedules } from "@/lib/data/inspections";
import { ScheduleList } from "@/components/inspection/schedule-list";

export default async function TodayPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const schedules = await getTodaySchedules(scope);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Today&apos;s Ops</h1>
        <p className="text-sm text-muted">
          {scope.scoped ? "Every check scheduled for today in your area." : "Every check scheduled for today, across every area."}
        </p>
      </div>
      <ScheduleList schedules={schedules} emptyLabel="No checklists scheduled yet — set one up under Checklists." />
    </div>
  );
}
