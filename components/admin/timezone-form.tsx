"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateFacilityTimezone } from "@/lib/actions/settings";

export function TimezoneForm({ facilityId, timezone, timezones }: { facilityId: string; timezone: string; timezones: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState(timezone);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs font-medium text-muted-strong">Timezone</label>
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1.5 block rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <Button
        size="sm"
        disabled={pending || value === timezone}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await updateFacilityTimezone(facilityId, value);
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
