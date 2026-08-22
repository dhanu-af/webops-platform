import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getSchedulesByCategory } from "@/lib/data/by-category";
import { ScheduleList } from "@/components/inspection/schedule-list";

export default async function PostOpPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const schedules = await getSchedulesByCategory("POST_OPERATION_CLEANING", scope);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Post-Operation Cleaning</h1>
        <p className="text-sm text-muted">Product clearance, equipment, room and final release condition.</p>
      </div>
      <ScheduleList schedules={schedules} emptyLabel="No post-operation cleaning checklists scheduled yet." />
    </div>
  );
}
