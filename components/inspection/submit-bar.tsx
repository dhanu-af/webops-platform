"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitInspection } from "@/lib/actions/inspections";
import { kioskSignOut } from "@/lib/actions-client/kiosk";

// `kiosk`: on a shop-floor iPad the person is signed out as soon as the check is submitted, so the next person starts fresh.
export function SubmitBar({ inspectionId, answered, total, kiosk = false }: { inspectionId: string; answered: number; total: number; kiosk?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="sticky bottom-0 -mx-6 border-t border-border bg-surface/95 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <div>
          <p className="font-mono-tabular text-sm font-semibold text-foreground">
            {answered} / {total}
          </p>
          <p className="text-xs text-muted">items completed</p>
          {error && <p className="mt-1 text-xs text-status-critical">{error}</p>}
        </div>
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              let result: Awaited<ReturnType<typeof submitInspection>>;
              try {
                result = await submitInspection(inspectionId);
              } catch {
                // Transient connection hiccups against the database show up here as an
                // opaque, redacted RSC error digest rather than a real error message —
                // nothing has been written yet at this point, so a single silent retry
                // is safe and resolves it without bothering the operator. (Validation
                // problems don't land here: they come back as { ok: false, error }.)
                try {
                  result = await submitInspection(inspectionId);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not submit.");
                  return;
                }
              }
              if (!result.ok) {
                setError(result.error);
                return;
              }
              if (kiosk) {
                await kioskSignOut("done");
                return;
              }
              router.refresh();
            })
          }
        >
          {pending ? "Submitting…" : "Submit for Verification"}
        </Button>
      </div>
    </div>
  );
}
