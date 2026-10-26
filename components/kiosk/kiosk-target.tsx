import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarOff } from "lucide-react";
import { auth } from "@/lib/auth";
import { getKioskAccess } from "@/lib/kiosk";
import { getKioskTarget } from "@/lib/data/kiosk";
import { describeNoProduction } from "@/lib/production-calendar";
import { KioskNotSetUp } from "@/components/kiosk/kiosk-gate";
import { KioskScheduleList } from "@/components/kiosk/kiosk-schedule-list";
import { KioskDoneButton } from "@/components/kiosk/kiosk-session";

/** A machine (kind "e") or area (kind "a") with the checks due today and the PIN step before starting one. */
export async function KioskTargetView({ kind, id }: { kind: "e" | "a"; id: string }) {
  if (!(await getKioskAccess()).allowed) return <KioskNotSetUp />;

  const [target, session] = await Promise.all([getKioskTarget(kind, id), auth()]);
  if (!target) notFound();

  const signedIn = !!session?.user;

  return (
    <>
      <Link href="/k" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-strong">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{target.title}</h1>
        <p className="text-sm text-muted">
          {kind === "e" && target.code ? `${target.code} · ` : ""}
          {target.areaName} · {target.sectionName}
        </p>
      </div>

      {signedIn && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
          <p className="text-base text-foreground">
            Signed in as <span className="font-semibold">{session!.user.name}</span>
          </p>
          <KioskDoneButton />
        </div>
      )}

      {!target.production.production && (
        <p role="status" className="flex items-start gap-2.5 rounded-xl border border-status-warn/30 bg-status-warn-soft px-4 py-3 text-sm text-status-warn">
          <CalendarOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">{describeNoProduction(target.production)} today.</span> Production checks are not due. Facility checks still are.
          </span>
        </p>
      )}

      <KioskScheduleList schedules={target.schedules} signedIn={signedIn} />

      {target.machines.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-strong">Machines in this area</h2>
          <div className="flex flex-wrap gap-2">
            {target.machines.map((m) => (
              <Link key={m.id} href={`/k/e/${m.id}`} className="inline-flex min-h-12 items-center rounded-xl border border-border-strong bg-surface px-4 text-base text-foreground active:bg-surface-sunken">
                {m.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
