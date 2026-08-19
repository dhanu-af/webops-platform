"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { verifyInspection, resubmitReturnedInspection } from "@/lib/actions/inspections";

export function VerificationActions({ inspectionId, stage }: { inspectionId: string; stage: "SUPERVISOR" | "QA" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "return" | "reject">("idle");

  function run(action: "APPROVE" | "RETURN" | "REJECT") {
    setError(null);
    startTransition(async () => {
      try {
        await verifyInspection({ inspectionId, action, comment: comment || undefined });
        router.refresh();
        setMode("idle");
        setComment("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">{stage === "SUPERVISOR" ? "Supervisor Verification" : "QA Verification"}</p>
      {mode !== "idle" && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder={mode === "return" ? "Reason for returning this inspection…" : "Reason for rejecting this inspection…"}
          className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      )}
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {mode === "idle" ? (
          <>
            <Button variant="pass" disabled={pending} onClick={() => run("APPROVE")}>
              Approve
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setMode("return")}>
              Return for Correction
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => setMode("reject")}>
              Reject
            </Button>
          </>
        ) : (
          <>
            <Button variant={mode === "return" ? "secondary" : "destructive"} disabled={pending || !comment} onClick={() => run(mode === "return" ? "RETURN" : "REJECT")}>
              Confirm {mode === "return" ? "Return" : "Rejection"}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function ResubmitButton({ inspectionId }: { inspectionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await resubmitReturnedInspection(inspectionId);
          router.refresh();
        })
      }
    >
      {pending ? "Reopening…" : "Resume Correction"}
    </Button>
  );
}
