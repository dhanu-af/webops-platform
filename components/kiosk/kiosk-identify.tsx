"use client";

import { useState, useTransition } from "react";
import { PinPad } from "@/components/kiosk/pin-pad";
import { Button } from "@/components/ui/button";
import { kioskSignIn } from "@/lib/actions-client/kiosk";

type Step = { kind: "pin" } | { kind: "new-pin"; temporary: string } | { kind: "confirm-pin"; temporary: string; newPin: string };

/**
 * Sign in with a PIN: type your 4-digit PIN and you are in, no name or password. The first time (after an admin
 * issued a temporary PIN) you choose your own. Calls onSignedIn once the session has started.
 */
export function KioskIdentify({ onSignedIn, onCancel }: { onSignedIn: () => void; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "pin" });
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function submit(pin: string, newPin?: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await kioskSignIn({ pin, newPin });
        if (result.status === "choose-new-pin") {
          setStep({ kind: "new-pin", temporary: pin });
          setResetKey((k) => k + 1);
          return;
        }
        onSignedIn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        // once the temporary PIN has been accepted, a problem is with the new PIN: choose it again
        if (newPin) setStep({ kind: "new-pin", temporary: pin });
        setResetKey((k) => k + 1);
      }
    });
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4 sm:p-6">
      {step.kind === "pin" && (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Sign in with your PIN</h2>
            {onCancel && (
              <Button variant="secondary" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
          <PinPad key={resetKey} label="Enter your 4-digit PIN" disabled={pending} onComplete={(pin) => submit(pin)} />
        </div>
      )}

      {step.kind === "new-pin" && (
        <div>
          <h2 className="mb-1 text-center text-lg font-semibold text-foreground">Choose your own PIN</h2>
          <p className="mb-4 text-center text-sm text-muted">Your PIN is your signature on every check you fill in. Pick 4 digits that only you know.</p>
          <PinPad
            key={resetKey}
            label="Choose a new 4-digit PIN"
            disabled={pending}
            onComplete={(newPin) => {
              setError(null);
              setStep({ kind: "confirm-pin", temporary: step.temporary, newPin });
              setResetKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {step.kind === "confirm-pin" && (
        <div>
          <h2 className="mb-4 text-center text-lg font-semibold text-foreground">Enter it once more</h2>
          <PinPad
            key={resetKey}
            label="Type the same PIN again"
            disabled={pending}
            onComplete={(again) => {
              if (again !== step.newPin) {
                setError("The two PINs did not match. Choose your PIN again.");
                setStep({ kind: "new-pin", temporary: step.temporary });
                setResetKey((k) => k + 1);
                return;
              }
              submit(step.temporary, step.newPin);
            }}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-status-critical-soft px-4 py-3 text-center text-sm font-medium text-status-critical">
          {error}
        </p>
      )}
      {pending && <p className="mt-4 text-center text-sm text-muted">Checking…</p>}
    </div>
  );
}
