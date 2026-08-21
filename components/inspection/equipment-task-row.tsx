"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveResponse } from "@/lib/actions/inspections";
import { formatAttribution } from "@/lib/format-attribution";

type SubItem = {
  id: string;
  stage: "Clean" | "Sanitised" | "Dry";
  required: boolean;
  choiceValue: string | null;
  respondedByName: string | null;
  respondedAt: Date | null;
};

// Renders a Clean/Sanitised/Dry equipment row as one card with three inline
// checkboxes, matching the paper form's C/S/D columns — instead of three
// separate stacked cards repeating the same equipment name and instructions.
// Each checkbox cycles blank -> Done -> N/A -> blank, since there's no room
// for two separate buttons per stage in a 3-column grid.
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

  function cycle(item: SubItem) {
    const next = item.choiceValue === "DONE" ? "NA" : item.choiceValue === "NA" ? "" : "DONE";
    startTransition(async () => {
      await saveResponse({ inspectionId, checklistItemId: item.id, choiceValue: next });

      // Marking "Clean" done completes Sanitised/Dry in the same tap — the
      // common case is all three happening in one pass, and this saves
      // clicking each stage separately. Only fills in blanks: an already-set
      // Sanitised/Dry (e.g. a deliberate N/A) is left alone.
      if (item.stage === "Clean" && next === "DONE") {
        const blankSiblings = items.filter((i) => i.id !== item.id && !i.choiceValue);
        await Promise.all(blankSiblings.map((sibling) => saveResponse({ inspectionId, checklistItemId: sibling.id, choiceValue: "DONE" })));
      }
    });
  }

  // One attribution line per row, not per checkbox — the most recent of the
  // three stages, since a single operator normally does all of them in one pass.
  const latest = items
    .filter((i) => i.respondedAt)
    .sort((a, b) => (b.respondedAt as Date).getTime() - (a.respondedAt as Date).getTime())[0];
  const attribution = latest ? formatAttribution(latest.respondedByName, latest.respondedAt) : null;

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
          const na = item.choiceValue === "NA";
          return (
            <button
              key={item.id}
              type="button"
              disabled={!editable}
              onClick={() => cycle(item)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-colors",
                done
                  ? "border-status-pass/40 bg-status-pass-soft text-status-pass"
                  : na
                    ? "border-status-neutral/40 bg-status-neutral-soft text-status-neutral"
                    : "border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border-2 text-[10px]",
                  done ? "border-status-pass bg-status-pass text-white" : na ? "border-status-neutral bg-status-neutral text-white" : "border-border-strong"
                )}
              >
                {done && (
                  <svg viewBox="0 0 16 16" fill="none" className="size-2.5">
                    <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {na && <span className="leading-none">–</span>}
              </span>
              {na ? `${item.stage} (N/A)` : item.stage}
            </button>
          );
        })}
      </div>
      {attribution && <p className="mt-2 font-mono-tabular text-[11px] text-muted">{attribution}</p>}
    </div>
  );
}
