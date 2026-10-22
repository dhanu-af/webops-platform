"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_IDLE_MINUTES } from "@/lib/session-config";

const WARN_SECONDS = 60;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

/**
 * Signs the user out after SESSION_IDLE_MINUTES with no activity (URS-01).
 *
 * The server's sliding JWT expiry only helps when the page makes requests; a
 * screen left open on a shared floor tablet makes none, so this timer ends the
 * session in the browser as well. A one-minute warning offers "Stay signed in".
 */
export function IdleLogout({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastActivity = useRef(0); // set to the real time on mount, below

  const touch = useCallback(() => {
    lastActivity.current = Date.now();
    setSecondsLeft(null);
    // Keeps the server-side sliding expiry alive too.
    void fetch("/api/auth/session", { cache: "no-store" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    lastActivity.current = Date.now();
    const onActivity = () => {
      // Once the warning is showing, only the button counts, not stray mouse moves.
      if (Date.now() - lastActivity.current < (SESSION_IDLE_MINUTES * 60 - WARN_SECONDS) * 1000) lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const tick = setInterval(() => {
      const idleSeconds = (Date.now() - lastActivity.current) / 1000;
      const remaining = SESSION_IDLE_MINUTES * 60 - idleSeconds;
      if (remaining <= 0) {
        clearInterval(tick);
        void signOutAction();
      } else if (remaining <= WARN_SECONDS) {
        setSecondsLeft(Math.ceil(remaining));
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tick);
    };
  }, [signOutAction]);

  if (secondsLeft === null) return null;
  return (
    <div role="alertdialog" aria-live="assertive" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-[var(--radius)] border border-status-warn/40 bg-surface p-4 shadow-[var(--shadow-md)]">
      <p className="text-sm font-semibold text-foreground">Still there?</p>
      <p className="mt-1 text-xs text-muted">You&apos;ll be signed out in {secondsLeft}s because of inactivity.</p>
      <button type="button" onClick={touch} className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">
        Stay signed in
      </button>
    </div>
  );
}
