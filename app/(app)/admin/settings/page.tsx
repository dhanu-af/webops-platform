import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimezoneForm } from "@/components/admin/timezone-form";
import { ProductionCalendarForm, type UpcomingClosedDay } from "@/components/admin/production-calendar-form";
import { getProductionCalendarConfig } from "@/lib/production-calendar-data";
import { dateKey, describeNoProduction, productionDayInfo } from "@/lib/production-calendar";
import { getFacilityTimezone, todayLabelInTimeZone } from "@/lib/timezone";
import { BrandingForm } from "@/components/admin/branding-form";
import { PhotoLimitForm } from "@/components/admin/photo-limit-form";
import { RetentionForm } from "@/components/admin/retention-form";
import { NotificationToggle } from "@/components/admin/notification-toggle";
import { NotificationRecipients } from "@/components/admin/notification-recipients";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/status";
import type { NotificationType } from "@/app/generated/prisma/client";
import { SAFE_USER } from "@/lib/safe-user";

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
    db.notificationRecipient.findMany({ include: { user: { select: SAFE_USER } }, orderBy: { user: { name: "asc" } } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const timezones = Intl.supportedValuesOf("timeZone");

  // Production calendar: the closed weekdays in the next 5 weeks (so a Saturday can be opened in one click),
  // and the single-date changes from the last month onwards.
  const [calendar, facilityTimeZone] = await Promise.all([getProductionCalendarConfig(), getFacilityTimezone()]);
  const todayLabel = todayLabelInTimeZone(facilityTimeZone);
  const todayKey = dateKey(todayLabel);
  const upcomingClosed: UpcomingClosedDay[] = [];
  for (let i = 0; i < 35; i++) {
    const label = new Date(todayLabel.getTime() + i * 24 * 60 * 60 * 1000);
    const normal = productionDayInfo(label, { closedWeekdays: calendar.closedWeekdays, exceptions: [] });
    if (normal.production) continue;
    const actual = productionDayInfo(label, calendar);
    const exception = calendar.exceptions.find((e) => e.date === dateKey(label));
    upcomingClosed.push({ date: dateKey(label), label: describeNoProduction(normal), opened: actual.production, reason: actual.note, exceptionId: exception?.id ?? null });
  }
  const monthAgo = dateKey(new Date(todayLabel.getTime() - 30 * 24 * 60 * 60 * 1000));
  const recentExceptions = calendar.exceptions.filter((e) => e.date >= monthAgo);
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
            <div key={facility.id} className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
          <CardTitle>Production calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <p className="text-sm text-muted">
            Which days there is production. On a no-production day nothing is due, the Calendar shows the day as closed and a production check cannot be started
            (facility checks such as the generator are not affected). Saturdays and Sundays are closed by default. Every change is recorded in the audit trail.
          </p>
          <ProductionCalendarForm closedWeekdays={calendar.closedWeekdays} exceptions={recentExceptions} upcomingClosed={upcomingClosed} todayKey={todayKey} />
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
          <CardTitle>Record Retention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <p className="text-sm text-muted">
            Inspection records, signatures and the audit trail are never deleted by the system. This is the minimum period the organisation commits to keeping them (SQF
            requires at least 3 years); it is shown in the footer and on every printed record.
          </p>
          <RetentionForm years={settings?.retentionYears ?? 3} />
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
