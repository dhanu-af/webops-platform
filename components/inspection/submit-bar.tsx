"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitInspection } from "@/lib/actions/inspections";

export function SubmitBar({ inspectionId, answered, total }: { inspectionId: string; answered: number; total: number }) {
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
              try {
                await submitInspection(inspectionId);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not submit.");
              }
            })
          }
        >
          {pending ? "Submitting…" : "Submit for Verification"}
        </Button>
      </div>
    </div>
  );
}
