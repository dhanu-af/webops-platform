import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getFacilityTimezone } from "@/lib/timezone";
import { formatDateTimeInTimeZone } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KioskDevices, type KioskDeviceRow } from "@/components/admin/kiosk-devices";
import { KioskPhonePolicy } from "@/components/admin/kiosk-phone-policy";

export const dynamic = "force-dynamic";

function toRows(devices: Awaited<ReturnType<typeof db.kioskDevice.findMany>>, timeZone: string): KioskDeviceRow[] {
  const now = Date.now();
  return devices.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.revokedAt ? "REVOKED" : d.tokenHash ? "REGISTERED" : d.setupExpiresAt && d.setupExpiresAt.getTime() > now ? "WAITING" : "EXPIRED",
    lastSeen: d.lastSeenAt ? formatDateTimeInTimeZone(d.lastSeenAt, timeZone) : null,
    createdAt: formatDateTimeInTimeZone(d.createdAt, timeZone),
  }));
}

export default async function KioskAdminPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "users.manage")) notFound();

  const [devices, timeZone, pinUsers, settings] = await Promise.all([
    db.kioskDevice.findMany({ orderBy: { createdAt: "asc" } }),
    getFacilityTimezone(),
    db.user.count({ where: { active: true, role: { in: ["OPERATOR", "TEAM_LEADER"] }, pinHash: { not: null } } }),
    db.systemSettings.findFirst({ select: { kioskAllowAnyPhone: true } }),
  ]);
  const rows = toRows(devices, timeZone);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Shop-floor iPads</h1>
        <p className="text-sm text-muted">Operators and Team Leaders fill in checks on a shared iPad with a 4-digit PIN instead of a User ID and password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-2 text-sm text-muted">
          <p>1. Add each iPad here and open its one-time setup link on that iPad. Only registered iPads can show the shop-floor screens.</p>
          <p>2. Print the QR codes and write the NFC tags for your machines under <Link className="text-accent hover:underline" href="/admin/tags">Machine tags</Link>.</p>
          <p>3. Give each Operator or Team Leader a temporary PIN on their user page. They choose their own PIN the first time. {pinUsers} {pinUsers === 1 ? "person has" : "people have"} a PIN now.</p>
          <p>4. On an iPad: scan the machine&apos;s QR code. On any phone: tap the NFC tag (or scan the QR code). Then choose your name, enter your PIN and fill in the check. It signs you out when you submit, or after 3 quiet minutes.</p>
          <p className="rounded-md bg-surface-sunken px-3 py-2 text-xs">
            Use the address you will keep using (for example your own domain) when you add iPads and print tags. An iPad is registered for one address, and the tags must point to the same one.
            Supervisors, QA and admins keep signing in with a password; verification and approval still need the password.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff phones</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <KioskPhonePolicy allowed={settings?.kioskAllowAnyPhone ?? true} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>iPads</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <KioskDevices devices={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
