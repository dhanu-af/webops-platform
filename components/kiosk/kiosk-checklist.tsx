import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarOff } from "lucide-react";
import { auth } from "@/lib/auth";
import { getKioskAccess } from "@/lib/kiosk";
import { getKioskChecklist, listKioskPeople } from "@/lib/data/kiosk";
import { describeNoProduction } from "@/lib/production-calendar";
import { KioskNotSetUp } from "@/components/kiosk/kiosk-gate";
import { KioskScheduleList } from "@/components/kiosk/kiosk-schedule-list";
import { KioskAdHocStart } from "@/components/kiosk/kiosk-adhoc-start";
import { KioskDoneButton } from "@/components/kiosk/kiosk-session";

/** A document's own page (its NFC tag / QR code opens this): where it is scheduled, with Start, or choose where it is for. */
export async function KioskChecklistView({ id }: { id: string }) {
  if (!(await getKioskAccess()).allowed) return <KioskNotSetUp />;

  const [doc, session] = await Promise.all([getKioskChecklist(id), auth()]);
  if (!doc) notFound();
  const signedIn = !!session?.user;
  const people = signedIn ? [] : await listKioskPeople();

  return (
    <>
      <Link href="/k" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-strong">
        <ArrowLeft className="size-4" /> Shop floor
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Document</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{doc.name}</h1>
      </div>

      {signedIn && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
          <p className="text-base text-foreground">
            Signed in as <span className="font-semibold">{session!.user.name}</span>
          </p>
          <KioskDoneButton />
        </div>
      )}

      {doc.closed ? (
        <p role="status" className="flex items-start gap-2.5 rounded-xl border border-status-warn/30 bg-status-warn-soft px-4 py-3 text-sm text-status-warn">
          <CalendarOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">{describeNoProduction(doc.production)} today.</span> A production check cannot be started today. An admin can open the day in Settings if work is going ahead.
          </span>
        </p>
      ) : doc.schedules.length > 0 ? (
        <KioskScheduleList schedules={doc.schedules} signedIn={signedIn} people={people} />
      ) : (
        <KioskAdHocStart checklistId={doc.id} areas={doc.areas} signedIn={signedIn} people={people} facilityLevel={doc.facilityLevel} />
      )}
    </>
  );
}
