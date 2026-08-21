import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimezoneForm } from "@/components/admin/timezone-form";
import { BrandingForm } from "@/components/admin/branding-form";
import { PhotoLimitForm } from "@/components/admin/photo-limit-form";
import { NotificationToggle } from "@/components/admin/notification-toggle";
import { NotificationRecipients } from "@/components/admin/notification-recipients";
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

  const [facilities, settings, notificationSettings, notificationRecipients, activeUsers] = await Promise.all([
    db.facility.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    db.systemSettings.findFirst(),
    db.notificationSetting.findMany(),
    db.notificationRecipient.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const timezones = Intl.supportedValuesOf("timeZone");
  const enabledByType = new Map(notificationSettings.map((s) => [s.type, s.enabled]));
  const recipientsByType = new Map<NotificationType, { id: string; name: string }[]>();
  for (const r of notificationRecipients) {
    const list = recipientsByType.get(r.type) ?? [];
    list.push({ id: r.userId, name: r.user.name });
    recipientsByType.set(r.type, list);
  }

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
            Turn individual notification types on or off, and add specific people who should also receive a type on top of whoever it already
            goes to by default (e.g. all Supervisors, all QA, or the person it&apos;s directly about).
          </p>
          <div className="divide-y divide-border">
            {NOTIFICATION_TYPES.map((type) => (
              <div key={type} className="space-y-1.5 py-2.5">
                <NotificationToggle type={type} label={NOTIFICATION_TYPE_LABELS[type]} enabled={enabledByType.get(type) ?? true} />
                <NotificationRecipients type={type} recipients={recipientsByType.get(type) ?? []} candidates={activeUsers} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
