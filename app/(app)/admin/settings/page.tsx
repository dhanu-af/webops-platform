import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimezoneForm } from "@/components/admin/timezone-form";
import { BrandingForm } from "@/components/admin/branding-form";
import { PhotoLimitForm } from "@/components/admin/photo-limit-form";
import { NotificationToggle } from "@/components/admin/notification-toggle";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/status";
import type { NotificationType } from "@/app/generated/prisma/client";

const NOTIFICATION_TYPES: NotificationType[] = [
  "CHECK_DUE",
  "CHECK_OVERDUE",
  "SUPERVISOR_VERIFICATION_REQUIRED",
  "QA_VERIFICATION_REQUIRED",
  "CORRECTIVE_ACTION_DUE",
  "CORRECTIVE_ACTION_OVERDUE",
  "RETURNED",
  "REJECTED",
  "AREA_RELEASED",
];

export default async function SettingsAdminPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "areas.manage")) notFound();

  const [facilities, settings, notificationSettings] = await Promise.all([
    db.facility.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    db.systemSettings.findFirst(),
    db.notificationSetting.findMany(),
  ]);
  const timezones = Intl.supportedValuesOf("timeZone");
  const enabledByType = new Map(notificationSettings.map((s) => [s.type, s.enabled]));

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
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <BrandingForm organizationName={settings?.organizationName ?? ""} logoUrl={settings?.logoUrl ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photo Evidence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <p className="text-sm text-muted">Maximum file size accepted for any photo uploaded as inspection evidence.</p>
          <PhotoLimitForm maxPhotoSizeMb={settings?.maxPhotoSizeMb ?? 10} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="mb-2 text-sm text-muted">
            Turn individual notification types on or off. This controls whether the notification fires at all — it doesn&apos;t yet let you choose
            <em> who</em> receives it (that still goes to every user in the relevant role, e.g. all Supervisors or all QA).
          </p>
          <div className="divide-y divide-border">
            {NOTIFICATION_TYPES.map((type) => (
              <NotificationToggle key={type} type={type} label={NOTIFICATION_TYPE_LABELS[type]} enabled={enabledByType.get(type) ?? true} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
