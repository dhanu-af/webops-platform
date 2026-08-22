"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  renameArea,
  renameEquipment,
  renameFacility,
  renameSection,
} from "@/lib/actions/facility";

const ACTIONS = {
  facility: renameFacility,
  section: renameSection,
  area: renameArea,
  equipment: renameEquipment,
} as const;

export function RenameButton({
  kind,
  id,
  name,
}: {
  kind: "facility" | "section" | "area" | "equipment";
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setOpen(true);
        }}
        className="text-[11px] font-medium text-muted-strong hover:text-foreground"
      >
        Rename
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await ACTIONS[kind](id, value);
            setOpen(false);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to rename.");
          }
        });
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="w-40 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-muted-strong hover:text-foreground"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </form>
  );
}
