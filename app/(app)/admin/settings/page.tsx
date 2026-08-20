import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimezoneForm } from "@/components/admin/timezone-form";

export default async function SettingsAdminPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "areas.manage")) notFound();

  const facilities = await db.facility.findMany({ where: { archived: false }, orderBy: { name: "asc" } });
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">System Settings</h1>
        <p className="text-sm text-muted">Facility-wide configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <p className="text-sm text-muted">Used for due-dates, ageing calculations and displayed timestamps across each facility.</p>
          {facilities.map((facility) => (
            <div key={facility.id} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{facility.name}</p>
                <p className="text-xs text-muted">{facility.code}</p>
              </div>
              <TimezoneForm facilityId={facility.id} timezone={facility.timezone} timezones={timezones} />
            </div>
          ))}
          {facilities.length === 0 && <p className="text-sm text-muted">No facilities configured yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Not yet built</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-sm text-muted">
            Notification routing (which role gets notified for which event), photo storage limits, and branding (organisation name/logo) all need a
            new persisted settings record — deliberately not added in this pass, since it means a schema migration against the live database.
            Notification routing in particular is currently hard-coded directly into the inspection submission/verification flow
            (<code className="font-mono-tabular">lib/actions/inspections.ts</code>), which this session also spent significant effort stabilising
            (see the error #441 write-up in <code className="font-mono-tabular">HANDOVER.md</code>) — reworking it into something configurable
            deserves its own careful pass, not a rushed addition here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
