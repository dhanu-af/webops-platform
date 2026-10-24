import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getSchedulesByCategory } from "@/lib/data/by-category";
import { ScheduleList } from "@/components/inspection/schedule-list";
import { OnDemandChecklists } from "@/components/inspection/on-demand-checklists";

export default async function AllergenChangeoverPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const schedules = await getSchedulesByCategory("ALLERGEN_CHANGEOVER", scope);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Allergen Changeover</h1>
        <p className="text-sm text-muted">Clean &amp; verify between products with different allergen profiles. The line is not released until QA approves.</p>
      </div>
      <ScheduleList schedules={schedules} emptyLabel="No allergen changeover checklists scheduled yet." />
      <OnDemandChecklists category="ALLERGEN_CHANGEOVER" />
    </div>
  );
}
