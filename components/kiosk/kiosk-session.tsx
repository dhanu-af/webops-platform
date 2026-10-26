"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kioskSignOut } from "@/lib/actions-client/kiosk";
import { KIOSK_IDLE_MINUTES } from "@/lib/pin";

const WARN_SECONDS = 30;
const ACTIVITY_EVENTS = ["pointerdown", "touchstart", "keydown", "scroll"] as const;

/** Ends the PIN session straight away and returns to the start page. */
export function KioskDoneButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      size="lg"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void kioskSignOut("done");
      }}
    >
      <LogOut className="size-5" /> {busy ? "Signing out…" : "Done"}
    </Button>
  );
}

/**
 * A shop-floor screen left alone signs itself out after KIOSK_IDLE_MINUTES, so the next person cannot carry on in
 * someone else's name. Everything already tapped in is saved, so nothing is lost. Warns for the last 30 seconds.
 */
export function KioskIdle() {
  const last = useRef(0);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    last.current = Date.now();
    const onActivity = () => {
      if (Date.now() - last.current < (KIOSK_IDLE_MINUTES * 60 - WARN_SECONDS) * 1000) last.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const tick = setInterval(() => {
      const remaining = KIOSK_IDLE_MINUTES * 60 - (Date.now() - last.current) / 1000;
      if (remaining <= 0) {
        clearInterval(tick);
        void kioskSignOut("idle");
      } else if (remaining <= WARN_SECONDS) setLeft(Math.ceil(remaining));
    }, 1000);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tick);
    };
  }, []);

  if (left === null) return null;
  return (
    <div role="alertdialog" aria-live="assertive" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-[var(--radius)] border border-status-warn/40 bg-surface p-4 shadow-[var(--shadow-md)]">
      <p className="text-base font-semibold text-foreground">Still there?</p>
      <p className="mt-1 text-sm text-muted">Signing out in {left}s so nobody else can use your name. Your answers are saved.</p>
      <Button
        className="mt-3"
        onClick={() => {
          last.current = Date.now();
          setLeft(null);
        }}
      >
        I am still here
      </Button>
    </div>
  );
}
