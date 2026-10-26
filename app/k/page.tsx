import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { getKioskAccess } from "@/lib/kiosk";
import { listKioskDocuments, listKioskPlaces } from "@/lib/data/kiosk";
import { KioskSignInPanel } from "@/components/kiosk/kiosk-signin-panel";
import { KioskNotSetUp } from "@/components/kiosk/kiosk-gate";
import { KioskScanner } from "@/components/kiosk/kiosk-scanner";
import { KioskDoneButton } from "@/components/kiosk/kiosk-session";

export const dynamic = "force-dynamic";

export default async function KioskHomePage({ searchParams }: { searchParams: Promise<{ done?: string; idle?: string; setup?: string; ready?: string }> }) {
  const query = await searchParams;
  const { device, allowed } = await getKioskAccess();
  if (!allowed) return <KioskNotSetUp invalidLink={query.setup === "invalid"} />;

  // The lists of documents and machines are for registered iPads and for anyone who has signed in with their PIN; a staff
  // phone that has not signed in gets the scan button and the PIN sign-in.
  const session = await auth();
  const signedIn = !!session?.user;
  const showLists = !!device || signedIn;
  const [places, documents] = await Promise.all([showLists ? listKioskPlaces() : Promise.resolve([]), showLists ? listKioskDocuments() : Promise.resolve([])]);
  const pinUser = session?.user?.authMethod === "pin" ? session.user : null;

  return (
    <>
      {query.setup === "invalid" && (
        <p role="alert" className="rounded-xl bg-status-critical-soft px-4 py-3 text-sm font-medium text-status-critical">
          That setup link is not valid any more (it works once, for 24 hours). Ask an admin for a new one. You can still use a machine tag with your PIN.
        </p>
      )}
      {query.ready && device && <p className="rounded-xl bg-status-pass-soft px-4 py-3 text-sm font-medium text-status-pass">This iPad is set up as &ldquo;{device.name}&rdquo;.</p>}
      {query.done && (
        <p className="flex items-center gap-2 rounded-xl bg-status-pass-soft px-4 py-3 text-sm font-medium text-status-pass">
          <CheckCircle2 className="size-4" /> Thank you. You have been signed out.
        </p>
      )}
      {query.idle && <p className="rounded-xl bg-status-warn-soft px-4 py-3 text-sm font-medium text-status-warn">You were signed out because the screen was not touched for a few minutes. Your answers were saved.</p>}

      {pinUser && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
          <p className="text-base text-foreground">
            Signed in as <span className="font-semibold">{pinUser.name}</span>
          </p>
          <KioskDoneButton />
        </div>
      )}

      {!signedIn && <KioskSignInPanel />}
      <KioskScanner />
      <p className="text-center text-xs text-muted">
        {device
          ? "On an iPhone or Android phone you can also just tap the NFC tag on the machine."
          : "Or tap the NFC tag on the machine or document with your phone. You will be asked for your 4-digit PIN."}
      </p>

      {documents.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-strong">Documents</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {documents.map((d) => (
              <Link key={d.id} href={`/k/c/${d.id}`} className="flex min-h-14 items-center rounded-xl border border-border-strong bg-surface px-4 text-base text-foreground active:bg-surface-sunken">
                {d.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {places.length > 0 && <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-strong">Or choose where you are</h2>
        <div className="space-y-3">
          {places.length === 0 && <p className="text-sm text-muted">No areas have been set up yet.</p>}
          {places.map((area) => (
            <div key={area.id} className="rounded-[var(--radius)] border border-border bg-surface">
              <Link href={`/k/a/${area.id}`} className="flex min-h-14 items-center gap-3 border-b border-border px-4 py-3 text-base font-semibold text-foreground">
                <MapPin className="size-5 text-muted" /> {area.name} <span className="text-xs font-normal text-muted">· {area.section}</span>
              </Link>
              {area.equipment.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3">
                  {area.equipment.map((e) => (
                    <Link key={e.id} href={`/k/e/${e.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground active:bg-surface-sunken">
                      {e.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>}
    </>
  );
}
