import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getSchedulesByCategory } from "@/lib/data/by-category";
import { ScheduleList } from "@/components/inspection/schedule-list";

export default async function FiveSPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const schedules = await getSchedulesByCategory("FIVE_S", scope);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">5S Audits</h1>
        <p className="text-sm text-muted">Sort · Set in Order · Shine · Standardise · Sustain.</p>
      </div>
      <ScheduleList schedules={schedules} emptyLabel="No 5S audits scheduled yet." />
    </div>
  );
}
