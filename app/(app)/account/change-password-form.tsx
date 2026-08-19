"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/actions/users";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        if (!currentPassword) return setError("Enter your current password.");
        if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
        if (newPassword !== confirmPassword) return setError("New passwords do not match.");
        startTransition(async () => {
          try {
            await changePassword({ currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setSuccess(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not change password.");
          }
        });
      }}
    >
      <div>
        <label className="text-xs font-medium text-muted-strong">Current password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      </div>
      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}
      {success && <p className="rounded-lg bg-status-pass-soft px-3 py-2 text-sm text-status-pass">Password updated.</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating…" : "Update Password"}
      </Button>
    </form>
  );
}
