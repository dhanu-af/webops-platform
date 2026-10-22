"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { closeCorrectiveAction } from "@/lib/actions/inspections";

// Supervisor/QA sign-off of a corrective action (URS-07, URS-09): needs the
// signer's password again, like any other electronic signature.
export function CloseCorrectiveActionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" variant="pass" onClick={() => setOpen(true)}>
        Verify &amp; Close
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Re-enter password to sign"
          className="w-48 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
        <Button
          size="sm"
          variant="pass"
          disabled={pending || !password}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await closeCorrectiveAction(id, password);
              if (!result.ok) {
                setError(result.error);
                setPassword("");
                return;
              }
              router.refresh();
            })
          }
        >
          {pending ? "Signing…" : "Sign & Close"}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="max-w-xs text-right text-[11px] text-status-critical">{error}</p>}
    </div>
  );
}
