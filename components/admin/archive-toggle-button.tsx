"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAreaArchived, setEquipmentArchived } from "@/lib/actions/facility";

export function ArchiveToggleButton({ kind, id, archived }: { kind: "area" | "equipment"; id: string; archived: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const action = kind === "area" ? setAreaArchived : setEquipmentArchived;
          await action(id, !archived);
          router.refresh();
        })
      }
      className="text-[11px] font-medium text-muted-strong hover:text-foreground disabled:opacity-50"
    >
      {pending ? "…" : archived ? "Restore" : "Archive"}
    </button>
  );
}
