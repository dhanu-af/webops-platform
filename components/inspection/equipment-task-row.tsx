"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveResponse } from "@/lib/actions/inspections";

type SubItem = {
  id: string;
  stage: "Clean" | "Sanitised" | "Dry";
  required: boolean;
  choiceValue: string | null;
};

// Renders a Clean/Sanitised/Dry equipment row as one card with three inline
// checkboxes, matching the paper form's C/S/D columns — instead of three
// separate stacked cards repeating the same equipment name and instructions.
export function EquipmentTaskRow({
  inspectionId,
  editable,
  equipmentName,
  helpText,
  items,
}: {
  inspectionId: string;
  editable: boolean;
  equipmentName: string;
  helpText: string | null;
  items: SubItem[];
}) {
  const [, startTransition] = useTransition();

  function toggle(item: SubItem) {
    const next = item.choiceValue === "DONE" ? "" : "DONE";
    startTransition(async () => {
      await saveResponse({ inspectionId, checklistItemId: item.id, choiceValue: next });
    });
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="text-sm font-medium text-foreground">
        {equipmentName}
        {items.some((i) => i.required) && <span className="ml-1 text-status-critical">*</span>}
      </p>
      {helpText && <p className="mt-0.5 text-xs text-muted">{helpText}</p>}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map((item) => {
          const done = item.choiceValue === "DONE";
          return (
            <button
              key={item.id}
              type="button"
              disabled={!editable}
              onClick={() => toggle(item)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-colors",
                done ? "border-status-pass/40 bg-status-pass-soft text-status-pass" : "border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border-2",
                  done ? "border-status-pass bg-status-pass text-white" : "border-border-strong"
                )}
              >
                {done && (
                  <svg viewBox="0 0 16 16" fill="none" className="size-2.5">
                    <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {item.stage}
            </button>
          );
        })}
      </div>
    </div>
  );
}
