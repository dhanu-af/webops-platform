"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

// Shown when a page fails to load (a dropped connection, a database timeout).
// The app chrome stays in place; the user can retry without losing their place.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-status-critical-soft text-status-critical">
        <AlertTriangle className="size-6" />
      </span>
      <div>
        <h1 className="text-lg font-semibold text-foreground">This page couldn&apos;t load</h1>
        <p className="mt-1 text-sm text-muted">
          Check your connection and try again. Nothing you have already saved has been lost.
        </p>
        {error.digest && <p className="mt-2 font-mono-tabular text-[11px] text-muted">Reference {error.digest}</p>}
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
      >
        <RotateCw className="size-4" /> Try again
      </button>
    </div>
  );
}
