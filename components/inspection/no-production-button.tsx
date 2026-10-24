"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markNoProduction } from "@/lib/actions/inspections";

// "Nothing was produced here today": closes the scheduled task without a
// checklist. The reason is optional; who closed it and when is recorded.
export function NoProductionButton({ scheduleId }: { scheduleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        No production
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        aria-label="Reason for no production"
        className="w-44 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
      />
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await markNoProduction({ scheduleId, reason });
            if (!result.ok) return setError(result.error);
            setOpen(false);
            setReason("");
            router.refresh();
          })
        }
      >
        {pending ? "Closing…" : "Confirm"}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <span className="basis-full text-xs text-status-critical">{error}</span>}
    </div>
  );
}
