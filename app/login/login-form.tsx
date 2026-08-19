"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
      <div>
        <label htmlFor="email" className="text-xs font-medium text-muted-strong">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="username"
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-xs font-medium text-muted-strong">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          placeholder="••••••••"
        />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="pt-2 text-center text-xs text-muted">
        Demo accounts — see HANDOVER.md for credentials.
      </p>
    </form>
  );
}
