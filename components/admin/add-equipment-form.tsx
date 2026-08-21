"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createEquipment } from "@/lib/actions/facility";

export function AddEquipmentForm({ areaId }: { areaId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-medium text-accent hover:underline">
        + Add equipment
      </button>
    );
  }

  return (
    <form
      className="mt-1.5 flex flex-wrap items-end gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await createEquipment({ areaId, name, code });
            setName("");
            setCode("");
            setOpen(false);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create equipment.");
          }
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Equipment name"
        className="w-28 rounded-md border border-border-strong bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code"
        className="w-16 rounded-md border border-border-strong bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-muted-strong hover:text-foreground">
        Cancel
      </button>
      {error && <p className="w-full text-[11px] text-status-critical">{error}</p>}
    </form>
  );
}
