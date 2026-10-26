import Image from "next/image";
import type { Metadata } from "next";

// The shop-floor screens. They sit outside the normal app shell: no menu, no account pages, big touch targets.
export const metadata: Metadata = { title: "Shop floor — Eagle Ops", robots: { index: false, follow: false } };

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="rounded-md bg-white px-2 py-1 shadow-[var(--shadow-xs)]">
          <Image src="/eagle-labs-logo.jpg" alt="Eagle Labs" width={120} height={56} className="h-8 w-auto" priority />
        </div>
        <p className="text-base font-semibold text-foreground">Shop floor checks</p>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">{children}</main>
    </div>
  );
}
