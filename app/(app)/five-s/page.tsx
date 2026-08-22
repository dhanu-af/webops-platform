import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getSchedulesByCategory } from "@/lib/data/by-category";
import { getFiveSLeaderboards } from "@/lib/data/five-s";
import { ScheduleList } from "@/components/inspection/schedule-list";
import { FiveSLeaderboard } from "@/components/five-s/five-s-leaderboard";

export default async function FiveSPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const [schedules, leaderboards] = await Promise.all([
    getSchedulesByCategory("FIVE_S", scope),
    getFiveSLeaderboards(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">5S Audits</h1>
        <p className="text-sm text-muted">Sort · Set in Order · Shine · Standardise · Sustain.</p>
      </div>
      <FiveSLeaderboard data={leaderboards} />
      <ScheduleList schedules={schedules} emptyLabel="No 5S audits scheduled yet." />
    </div>
  );
}
