"use client";

import { useTransition } from "react";
import { cloneChecklist } from "@/lib/actions/checklist-builder";
import { Copy } from "lucide-react";

export function CloneChecklistButton({ checklistId }: { checklistId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Clone this checklist"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          try {
            await cloneChecklist(checklistId);
          } catch (err) {
            if (err instanceof Error && err.message !== "NEXT_REDIRECT") throw err;
          }
        });
      }}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken disabled:opacity-50"
    >
      <Copy className="size-3.5" />
    </button>
  );
}
