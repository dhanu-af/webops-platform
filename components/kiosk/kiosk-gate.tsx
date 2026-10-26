import { Smartphone } from "lucide-react";

/** Shown instead of the PIN pages when PIN sign-in is not available on this device. */
export function KioskNotSetUp({ invalidLink }: { invalidLink?: boolean }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center">
      <Smartphone className="mx-auto mb-3 size-10 text-muted" aria-hidden />
      <h1 className="text-lg font-semibold text-foreground">This device is not set up yet</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {invalidLink
          ? "That setup link is not valid any more (it can be used once, for 24 hours). Ask an admin for a new one."
          : "PIN sign-in is not available on this device at the moment. Sign in with your User ID and password, or ask an admin."}
      </p>
    </div>
  );
}
