"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { adminResetPassword } from "@/lib/actions/users";
import { validatePassword } from "@/lib/password-policy";
import { generateTemporaryPassword } from "@/lib/temp-password";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [temporary, setTemporary] = useState(true);

  return (
    <form
      className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setDone(false);
        { const problems = validatePassword(newPassword); if (problems.length) return setError(problems.join(" ")); }
        startTransition(async () => {
          try {
            const result = await adminResetPassword(userId, newPassword, temporary);
            if (!result.ok) return setError(result.error);
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
        <div className="mt-1.5 flex gap-2">
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
            placeholder="At least 10 characters"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setNewPassword(generateTemporaryPassword());
              setShowPassword(true);
            }}
          >
            Generate
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? "Hide" : "Show"}
          </Button>
        </div>
        <label className="mt-2 flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" className="mt-0.5" checked={temporary} onChange={(e) => setTemporary(e.target.checked)} />
          <span>Temporary — the user must choose a new password at their next sign-in.</span>
        </label>
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
