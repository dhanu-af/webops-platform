"use client";

import { useTransition } from "react";
import { deleteChecklist } from "@/lib/actions/checklist-builder";
import { Trash2 } from "lucide-react";

export function DeleteChecklistButton({ checklistId, checklistName }: { checklistId: string; checklistName: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Delete this checklist"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(`Permanently delete "${checklistName}"? This can't be undone.`)) return;
        startTransition(async () => {
          try {
            await deleteChecklist(checklistId);
          } catch (err) {
            window.alert(err instanceof Error ? err.message : "Failed to delete checklist.");
          }
        });
      }}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface text-muted-strong hover:border-status-critical hover:text-status-critical disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
