import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getOnDemandChecklists } from "@/lib/data/by-category";
import { OnDemandList } from "@/components/inspection/on-demand-list";
import type { ChecklistCategory } from "@/app/generated/prisma/client";

// "Start any": every checklist in the category, whether or not it is scheduled
// today. Pick the place, fill it in and submit it for verification.
export async function OnDemandChecklists({ category, facilityLevel = false }: { category: ChecklistCategory; facilityLevel?: boolean }) {
  const session = await auth();
  const { checklists, areas } = await getOnDemandChecklists(category, session?.user ? getUserScope(session.user) : { scoped: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start any checklist</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="mb-3 text-xs text-muted">
          Select the checklist you need and the area it is for, then press Start. Fill it in and submit it for verification. Anything you started but did not finish opens where you left off.
        </p>
        {checklists.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No checklists of this type have been created yet.</p>
        ) : (
          <OnDemandList checklists={checklists} areas={areas} facilityLevel={facilityLevel} />
        )}
      </CardContent>
    </Card>
  );
}
