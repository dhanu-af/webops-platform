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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">PIN sign-in</h1>
        <p className="text-sm text-muted">Operators and Team Leaders sign in with just a 4-digit PIN, on any phone or iPad, instead of a User ID and password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-2 text-sm text-muted">
          <p>1. Give each Operator or Team Leader a temporary PIN on their user page. They choose their own PIN the first time (no two people can have the same PIN). {pinUsers} {pinUsers === 1 ? "person has" : "people have"} a PIN now.</p>
          <p>2. Write the NFC tags (or print the QR codes) for your documents and machines under <Link className="text-accent hover:underline" href="/admin/tags">NFC tags</Link>.</p>
          <p>3. To fill in a document: tap its NFC tag with a phone (or scan the QR code), press Start, type your PIN and fill it in. You can also open the site and choose &ldquo;Sign in with your PIN&rdquo;. It signs you out when you submit, or after 3 quiet minutes.</p>
          <p className="rounded-md bg-surface-sunken px-3 py-2 text-xs">
            Supervisors, QA and admins keep signing in with a password; verification and approval still need the password. Because the PIN alone identifies a person, wrong PINs are limited: 5 tries per
            network and 25 overall every 15 minutes, after which people can still sign in with their password. Registering iPads below is optional.
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
