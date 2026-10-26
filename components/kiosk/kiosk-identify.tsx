"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinPad } from "@/components/kiosk/pin-pad";
import { kioskSignIn } from "@/lib/actions-client/kiosk";

type Person = { id: string; name: string };
type Step = { kind: "name" } | { kind: "pin"; person: Person } | { kind: "new-pin"; person: Person; temporary: string } | { kind: "confirm-pin"; person: Person; temporary: string; newPin: string };

/**
 * "Who are you?" -- pick your name, enter your 4-digit PIN. The first time (after an admin issued a temporary
 * PIN) you choose your own. Calls onSignedIn once the server has started the session.
 */
export function KioskIdentify({ people, onSignedIn, onCancel }: { people: Person[]; onSignedIn: () => void; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "name" });
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  }, [people, search]);

  function submit(person: Person, pin: string, newPin?: string, temporary?: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await kioskSignIn({ userId: person.id, pin, newPin });
        if (result.status === "choose-new-pin") {
          setStep({ kind: "new-pin", person, temporary: pin });
          setResetKey((k) => k + 1);
          return;
        }
        onSignedIn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        // the temporary PIN was already accepted, so a problem now is with the new PIN: choose it again
        if (temporary) setStep({ kind: "new-pin", person, temporary });
        setResetKey((k) => k + 1);
      }
    });
  }

  const back = (
    <button
      type="button"
      onClick={() => {
        setStep({ kind: "name" });
        setError(null);
      }}
      className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-strong"
    >
      <ArrowLeft className="size-4" /> Not you? Choose a different name
    </button>
  );

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4 sm:p-6">
      {step.kind === "name" && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Who are you?</h2>
            {onCancel && (
              <Button variant="secondary" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
          {people.length > 8 && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type your name to find it"
              className="mb-3 h-12 w-full rounded-xl border border-border-strong bg-surface px-4 text-base outline-none focus:border-accent"
              autoComplete="off"
            />
          )}
          {people.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No one has a shop-floor PIN yet. Ask a supervisor to set one up.</p>
          ) : (
            <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setStep({ kind: "pin", person: p });
                    setError(null);
                    setResetKey((k) => k + 1);
                  }}
                  className="flex min-h-16 items-center gap-3 rounded-2xl border border-border-strong bg-surface px-4 py-3 text-left text-base font-medium text-foreground shadow-[var(--shadow-xs)] active:scale-[0.98] active:bg-surface-sunken"
                >
                  <UserRound className="size-5 shrink-0 text-muted" />
                  <span className="min-w-0 break-words">{p.name}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="col-span-full py-4 text-center text-sm text-muted">No one called that.</p>}
            </div>
          )}
        </div>
      )}

      {step.kind === "pin" && (
        <div>
          {back}
          <h2 className="mb-1 text-center text-lg font-semibold text-foreground">{step.person.name}</h2>
          <PinPad label="Enter your 4-digit PIN" key={resetKey} disabled={pending} onComplete={(pin) => submit(step.person, pin)} />
        </div>
      )}

      {step.kind === "new-pin" && (
        <div>
          <h2 className="mb-1 text-center text-lg font-semibold text-foreground">Choose your own PIN</h2>
          <p className="mb-4 text-center text-sm text-muted">Your PIN is your signature on every check you fill in. Pick 4 digits that only you know.</p>
          <PinPad
            label="Choose a new 4-digit PIN"
            key={resetKey}
            disabled={pending}
            onComplete={(newPin) => {
              setError(null);
              setStep({ kind: "confirm-pin", person: step.person, temporary: step.temporary, newPin });
              setResetKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {step.kind === "confirm-pin" && (
        <div>
          <h2 className="mb-4 text-center text-lg font-semibold text-foreground">Enter it once more</h2>
          <PinPad
            label="Type the same PIN again"
            key={resetKey}
            disabled={pending}
            onComplete={(again) => {
              if (again !== step.newPin) {
                setError("The two PINs did not match. Choose your PIN again.");
                setStep({ kind: "new-pin", person: step.person, temporary: step.temporary });
                setResetKey((k) => k + 1);
                return;
              }
              submit(step.person, step.temporary, step.newPin, step.temporary);
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
