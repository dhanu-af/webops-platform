"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updatePhotoLimit } from "@/lib/actions/settings";

export function PhotoLimitForm({ maxPhotoSizeMb }: { maxPhotoSizeMb: number }) {
  const router = useRouter();
  const [value, setValue] = useState(maxPhotoSizeMb);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs font-medium text-muted-strong">Max photo size (MB)</label>
        <input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mt-1.5 w-28 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <Button
        size="sm"
        disabled={pending || value === maxPhotoSizeMb}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await updatePhotoLimit(value);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save.");
            }
          })
        }
      >
        {pending ? "Saving…" : "Save"}
      </Button>
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
