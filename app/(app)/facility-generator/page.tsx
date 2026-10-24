import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getSchedulesByCategory } from "@/lib/data/by-category";
import { ScheduleList } from "@/components/inspection/schedule-list";
import { OnDemandChecklists } from "@/components/inspection/on-demand-checklists";

export default async function FacilityGeneratorPage() {
  const session = await auth();
  const scope = getUserScope(session!.user);
  const schedules = await getSchedulesByCategory("FACILITY_GENERATOR", scope);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Facility &amp; Generator</h1>
        <p className="text-sm text-muted">Generator ON and OFF checks, and production facility opening and closing checks.</p>
      </div>
      <ScheduleList schedules={schedules} emptyLabel="Nothing scheduled — use “Start any checklist” below." />
      <OnDemandChecklists category="FACILITY_GENERATOR" facilityLevel />
    </div>
  );
}
