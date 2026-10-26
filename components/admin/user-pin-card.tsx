"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearUserPin, issueUserPin } from "@/lib/actions-client/kiosk-admin";

export type PinStatus = "NONE" | "TEMPORARY" | "SET";

const STATUS: Record<PinStatus, { label: string; tone: "neutral" | "warn" | "pass" | "critical" }> = {
  NONE: { label: "No PIN", tone: "neutral" },
  TEMPORARY: { label: "Temporary PIN issued: waiting for the person to choose their own", tone: "warn" },
  SET: { label: "PIN set", tone: "pass" },
};

export function UserPinCard({ userId, userName, status }: { userId: string; userName: string; status: PinStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [pinOnly, setPinOnly] = useState(false);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
      </div>
      <p className="text-sm text-muted">
        A 4-digit PIN lets {userName} sign in on any phone or iPad by typing just the PIN, with no User ID or password, and fill in checks. You hand over a temporary PIN and they choose their own
        the first time, so you never know it. No two people can have the same PIN. Verification and approvals still need their password.
      </p>

      {issued && (
        <div className="rounded-[var(--radius)] border border-accent/40 bg-accent-soft p-4 text-center">
          <p className="text-xs font-medium text-muted-strong">Temporary PIN for {userName} (shown only now)</p>
          <p className="my-2 font-mono text-4xl font-semibold tracking-[0.4em] text-foreground">{issued}</p>
          <p className="text-xs text-muted-strong">Tell them in person. They will be asked to choose their own PIN the first time.</p>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" className="mt-0.5" checked={pinOnly} onChange={(e) => setPinOnly(e.target.checked)} />
        <span>
          PIN only: switch off password sign-in for this person. Use this for people who only sign in with a PIN, so nobody (you included) knows a password that could be used in
          their name. A password can be set again later by resetting it.
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(async () => {
              if (status !== "NONE" && !confirm(`Issue a new temporary PIN for ${userName}? Their current PIN stops working.`)) return;
              const result = await issueUserPin(userId, { pinOnly });
              setIssued(result.pin);
            })
          }
        >
          {status === "NONE" ? "Give a PIN" : "Issue a new temporary PIN"}
        </Button>
        {status !== "NONE" && (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (confirm(`Remove the PIN for ${userName}?`)) {
                setIssued(null);
                run(() => clearUserPin(userId));
              }
            }}
          >
            Remove PIN
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
