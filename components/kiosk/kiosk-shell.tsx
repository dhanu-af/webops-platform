import Image from "next/image";
import Link from "next/link";
import { KioskDoneButton, KioskIdle } from "@/components/kiosk/kiosk-session";

/**
 * The whole screen for someone signed in with a shop-floor PIN: no menu to wander around, just their name, a way
 * back to the machine list and a Done button. Used by the app layout for PIN sessions.
 */
export function KioskShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <KioskIdle />
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/k" className="shrink-0 rounded-md bg-white px-2 py-1 shadow-[var(--shadow-xs)]">
          <Image src="/eagle-labs-logo.jpg" alt="Eagle Labs" width={120} height={56} className="h-8 w-auto" priority />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted">Signed in with your PIN</p>
        </div>
        <Link href="/k" className="hidden h-14 items-center rounded-lg border border-border-strong bg-surface px-5 text-base font-medium text-foreground sm:inline-flex">
          Machines
        </Link>
        <KioskDoneButton />
      </header>
      <main className="mx-auto max-w-4xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
