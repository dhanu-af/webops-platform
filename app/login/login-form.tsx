"use client";

import { useState } from "react";
import { useActionState } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-7 space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
      <div>
        <label htmlFor="loginId" className="text-xs font-medium text-muted-strong">
          User ID
        </label>
        <div className="relative mt-1.5">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input
            id="loginId"
            name="loginId"
            type="text"
            required
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            className="w-full rounded-lg border border-border-strong bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
            placeholder="Your User ID"
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="text-xs font-medium text-muted-strong">
          Password
        </label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-border-strong bg-surface py-2.5 pl-9 pr-9 text-sm text-foreground outline-none transition-colors focus:border-accent"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" strokeWidth={2} /> : <Eye className="size-4" strokeWidth={2} />}
          </button>
        </div>
      </div>
      {state?.error && (
        <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="border-t border-border pt-4 text-center text-sm text-muted">
        Operator or Team Leader?{" "}
        <Link href="/k" className="font-medium text-accent hover:underline">
          Sign in with your PIN
        </Link>
      </p>
    </form>
  );
}
