"use client";

import { useCallback, useState, useTransition } from "react";

// useTransition for save-as-you-go controls. A refused save (the record was
// just submitted, the user lost access, the network dropped) is kept as
// `error` for the control to show, instead of rejecting inside the transition
// and taking the whole page down to the error screen.
export function useSafeTransition() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (task: () => Promise<unknown>) => {
      start(async () => {
        setError(null);
        try {
          await task();
        } catch (e) {
          setError(e instanceof Error && e.message ? e.message : "Could not save. Check your connection and try again.");
        }
      });
    },
    [start]
  );

  return { pending, run, error };
}
