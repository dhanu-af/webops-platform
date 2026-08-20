"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateBranding } from "@/lib/actions/settings";

export function BrandingForm({ organizationName, logoUrl }: { organizationName: string; logoUrl: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await updateBranding(formData);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save.");
          }
        });
      }}
    >
      <div className="flex items-end gap-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- external/blob-hosted logo, not a static asset
          <img src={logoUrl} alt="Organisation logo" className="size-14 rounded-lg border border-border-strong object-contain" />
        )}
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-strong">Organisation name</label>
          <input
            name="organizationName"
            defaultValue={organizationName}
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="e.g. Northgate Manufacturing"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-strong">Logo (optional)</label>
        <input
          type="file"
          name="logo"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="mt-1.5 block w-full text-sm text-muted-strong file:mr-3 file:rounded-lg file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
      </div>
      {error && <p className="rounded-lg bg-status-critical-soft px-3 py-2 text-sm text-status-critical">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save Branding"}
      </Button>
    </form>
  );
}
