"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { verifyInspection, resubmitReturnedInspection } from "@/lib/actions/inspections";

const INPUT = "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export function VerificationActions({ inspectionId, stage, signerName }: { inspectionId: string; stage: "SUPERVISOR" | "QA"; signerName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "approve" | "return" | "reject">("idle");

  function run(action: "APPROVE" | "RETURN" | "REJECT") {
    setError(null);
    startTransition(async () => {
      try {
        const result = await verifyInspection({ inspectionId, action, comment: comment || undefined, password });
        if (!result.ok) {
          setError(result.error);
          setPassword("");
          return;
        }
        router.refresh();
        setMode("idle");
        setComment("");
        setPassword("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  const meaning = stage === "QA" ? "Approved" : "Verified";

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">{stage === "SUPERVISOR" ? "Supervisor Verification" : "QA Verification"}</p>
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="pass" disabled={pending} onClick={() => setMode("approve")}>
            {stage === "QA" ? "Approve" : "Verify"}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setMode("return")}>
            Return for Correction
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => setMode("reject")}>
            Reject
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {mode !== "approve" && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={mode === "return" ? "Reason for returning this inspection…" : "Reason for rejecting this inspection…"}
              className={INPUT}
            />
          )}
          <div className="rounded-lg border border-border bg-surface-sunken/60 p-3">
            <p className="text-xs text-muted">
              Electronic signature — <span className="font-medium text-foreground">{signerName}</span> signing as{" "}
              <span className="font-medium text-foreground">{mode === "approve" ? meaning : mode === "return" ? "Returned" : "Rejected"}</span>. Re-enter your password to sign.
            </p>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={`${INPUT} mt-2`}
            />
          </div>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "approve" ? "pass" : mode === "return" ? "secondary" : "destructive"}
              disabled={pending || !password || (mode !== "approve" && !comment)}
              onClick={() => run(mode === "approve" ? "APPROVE" : mode === "return" ? "RETURN" : "REJECT")}
            >
              {pending ? "Signing…" : `Sign & ${mode === "approve" ? meaning : mode === "return" ? "Return" : "Reject"}`}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setMode("idle");
                setError(null);
                setPassword("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {mode === "idle" && error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}

export function ResubmitButton({ inspectionId }: { inspectionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Resume Correction
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">Reopen this record to correct it</p>
      <p className="text-xs text-muted">The original answers are kept in the audit trail; every change you make from here is logged with your reason.</p>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason for the correction…" className={INPUT} />
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={pending || reason.trim().length < 5}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await resubmitReturnedInspection(inspectionId, reason);
              if (!result.ok) return setError(result.error);
              router.refresh();
            })
          }
        >
          {pending ? "Reopening…" : "Reopen for correction"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
