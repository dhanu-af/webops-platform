"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * Large-button PIN entry for a touch screen: four dots, a number pad, and it submits by itself on the fourth
 * digit. To empty it again (after a wrong PIN, or when moving to the next step) the parent gives it a new `key`.
 */
export function PinPad({ onComplete, disabled, label }: { onComplete: (pin: string) => void; disabled?: boolean; label: string }) {
  const [digits, setDigits] = useState("");

  function press(d: string) {
    if (disabled) return;
    const next = (digits + d).slice(0, 4);
    setDigits(next);
    if (next.length === 4) onComplete(next);
  }

  const key = "flex h-16 items-center justify-center rounded-2xl border border-border-strong bg-surface text-2xl font-semibold text-foreground shadow-[var(--shadow-xs)] transition active:scale-95 active:bg-surface-sunken disabled:opacity-40";

  return (
    <div className="mx-auto w-full max-w-xs">
      <p className="mb-3 text-center text-sm font-medium text-muted-strong">{label}</p>
      <div className="mb-5 flex justify-center gap-3" aria-label={`${digits.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("size-4 rounded-full border-2 border-border-strong", i < digits.length && "border-accent bg-accent")} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button key={k} type="button" disabled={disabled} onClick={() => press(k)} className={key}>
            {k}
          </button>
        ))}
        <span />
        <button type="button" disabled={disabled} onClick={() => press("0")} className={key}>
          0
        </button>
        <button type="button" disabled={disabled || digits.length === 0} onClick={() => setDigits((d) => d.slice(0, -1))} className={cn(key, "text-muted")} aria-label="Delete the last digit">
          <Delete className="size-6" />
        </button>
      </div>
    </div>
  );
}
