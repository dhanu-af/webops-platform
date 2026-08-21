"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAreaArchived, setEquipmentArchived, setFacilityArchived, setSectionArchived } from "@/lib/actions/facility";
import { setChecklistActive } from "@/lib/actions/checklist-builder";

const ACTIONS = {
  facility: setFacilityArchived,
  section: setSectionArchived,
  area: setAreaArchived,
  equipment: setEquipmentArchived,
  // Checklist uses `active` (opposite sense of "archived") — flip it here so
  // the button's own API stays the same "archived" boolean for every kind.
  checklist: (id: string, archived: boolean) => setChecklistActive(id, !archived),
} as const;

export function ArchiveToggleButton({
  kind,
  id,
  archived,
}: {
  kind: "facility" | "section" | "area" | "equipment" | "checklist";
  id: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await ACTIONS[kind](id, !archived);
          router.refresh();
        })
      }
      className="text-[11px] font-medium text-muted-strong hover:text-foreground disabled:opacity-50"
    >
      {pending ? "…" : archived ? "Restore" : "Archive"}
    </button>
  );
}
