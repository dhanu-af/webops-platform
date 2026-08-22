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

// Renders a Clean/Sanitised/Dry equipment row as one card, one labeled row
// per stage with direct-set Done/N/A buttons — the same tap-a-fixed-value
// interaction as the PASS_FAIL/ACKNOWLEDGEMENT items used by 5S Audit
// checks elsewhere, not a single checkbox that cycled through blank -> Done
// -> N/A -> blank on repeated taps. The cycling version depended on
// `item.choiceValue` from the last server-revalidated render to compute
// its next state; on a slow/flaky mobile connection a second tap could
// land before that revalidation came back, so it read the same stale
// current state and computed the same next state again — the tap visibly
// "did nothing". Direct-set buttons don't have this failure mode: each one
// always saves the same fixed value no matter what the current state is.
export function EquipmentTaskRow({
  inspectionId,
  editable,
  equipmentName,
  helpText,
  items,
  timeZone,
}: {
  inspectionId: string;
  editable: boolean;
  equipmentName: string;
  helpText: string | null;
  items: SubItem[];
  timeZone: string;
}) {
  const [, startTransition] = useTransition();

  function setStage(item: SubItem, value: "DONE" | "NA") {
    startTransition(async () => {
      await saveResponse({ inspectionId, checklistItemId: item.id, choiceValue: value });

      // Marking "Clean" done completes Sanitised/Dry in the same tap — the
      // common case is all three happening in one pass, and this saves
      // tapping each stage separately. Only fills in blanks: an already-set
      // Sanitised/Dry (e.g. a deliberate N/A) is left alone.
      if (item.stage === "Clean" && value === "DONE") {
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
  const attribution = latest ? formatAttribution(latest.respondedByName, latest.respondedAt, timeZone) : null;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="text-sm font-medium text-foreground">
        {equipmentName}
        {items.some((i) => i.required) && <span className="ml-1 text-status-critical">*</span>}
      </p>
      {helpText && <p className="mt-0.5 text-xs text-muted">{helpText}</p>}

      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const done = item.choiceValue === "DONE";
          const na = item.choiceValue === "NA";
          return (
            <div key={item.id} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium text-muted-strong">{item.stage}</span>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => setStage(item, "DONE")}
                  className={cn(
                    "h-11 rounded-xl text-sm font-semibold transition-colors",
                    done ? "bg-status-pass text-white" : "border border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
                  )}
                >
                  Done
                </button>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => setStage(item, "NA")}
                  className={cn(
                    "h-11 rounded-xl text-sm font-semibold transition-colors",
                    na ? "bg-status-neutral text-white" : "border border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
                  )}
                >
                  N/A
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {attribution && <p className="mt-2 font-mono-tabular text-[11px] text-muted">{attribution}</p>}
    </div>
  );
}
