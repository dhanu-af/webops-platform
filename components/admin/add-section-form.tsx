"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSection } from "@/lib/actions/facility";

export function AddSectionForm({ facilityId }: { facilityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-accent hover:underline">
        + Add section
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
            await createSection({ facilityId, name, code });
            setName("");
            setCode("");
            setOpen(false);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create section.");
          }
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Section name"
        className="w-36 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code"
        className="w-20 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
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
