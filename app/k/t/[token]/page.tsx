import Link from "next/link";
import { redirect } from "next/navigation";
import { getKioskAccess } from "@/lib/kiosk";
import { resolveKioskTag } from "@/lib/data/kiosk";
import { KioskNotSetUp } from "@/components/kiosk/kiosk-gate";

export const dynamic = "force-dynamic";

// The address written on an NFC tag or printed as a QR code. It only reveals which machine it is to a registered
// device; anywhere else it says the device is not set up.
export default async function KioskTagPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await getKioskAccess()).allowed) return <KioskNotSetUp />;

  const target = await resolveKioskTag(token);
  if (target) redirect(`/k/${target.kind}/${target.id}`);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">This tag is not recognised</h1>
      <p className="mt-2 text-sm text-muted">It may have been replaced or the machine removed. Choose the machine from the list instead.</p>
      <Link href="/k" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-accent px-5 text-base font-medium text-white">
        Choose a machine
      </Link>
    </div>
  );
}
