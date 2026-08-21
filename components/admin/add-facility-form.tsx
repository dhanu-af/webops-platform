"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createFacility } from "@/lib/actions/facility";

export function AddFacilityForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-accent hover:underline">
        + Add facility
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border-strong bg-surface p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await createFacility({ name, code, address: address || undefined });
            setName("");
            setCode("");
            setAddress("");
            setOpen(false);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create facility.");
          }
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Facility name"
        className="w-40 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code"
        className="w-20 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
      />
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address (optional)"
        className="w-44 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-strong hover:text-foreground">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-status-critical">{error}</p>}
    </form>
  );
}
