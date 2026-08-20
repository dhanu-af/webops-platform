"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { adminResetPassword } from "@/lib/actions/users";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  return (
    <form
      className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setDone(false);
        if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
        startTransition(async () => {
          try {
            await adminResetPassword(userId, newPassword);
            setNewPassword("");
            setDone(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reset password.");
          }
        });
      }}
    >
      <div>
        <label className="text-xs font-medium text-muted-strong">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="At least 8 characters"
        />
        <p className="mt-1.5 text-xs text-muted">
          For a user who&apos;s completely locked out — sets their password directly, no current password needed. Tell them the new password
          through a secure channel; they can change it themselves from Account settings afterward.
        </p>
      </div>
      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}
      {done && <p className="rounded-lg bg-status-pass-soft px-3 py-2 text-sm text-status-pass">Password reset.</p>}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? "Resetting…" : "Reset Password"}
      </Button>
    </form>
  );
}
