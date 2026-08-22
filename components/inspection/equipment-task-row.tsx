"use client";

import { useState, useTransition } from "react";
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
// buttons, matching the paper form's C/S/D columns — instead of three
// separate stacked cards repeating the same equipment name and instructions.
// Each button cycles blank -> Done -> N/A -> blank on tap (no separate
// checkbox icon — the button's own fill color is the only state indicator).
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
  // Optimistic local overrides, keyed by item id. saveResponse's
  // revalidatePath round-trip can take long enough on a slow mobile
  // connection that a second rapid tap would otherwise still see the
  // pre-tap `item.choiceValue` from props and cycle from the same starting
  // value again — the tap would visibly do nothing. Reading through this
  // map first means every tap always builds on the outcome of the tap
  // before it, not on whatever the server has confirmed so far.
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  function currentValue(item: SubItem): string {
    return overrides[item.id] ?? item.choiceValue ?? "";
  }

  function cycle(item: SubItem) {
    const next = currentValue(item) === "DONE" ? "NA" : currentValue(item) === "NA" ? "" : "DONE";
    setOverrides((prev) => ({ ...prev, [item.id]: next }));

    startTransition(async () => {
      await saveResponse({ inspectionId, checklistItemId: item.id, choiceValue: next });

      // Marking "Clean" done completes Sanitised/Dry in the same tap — the
      // common case is all three happening in one pass, and this saves
      // tapping each stage separately. Only fills in blanks: an already-set
      // Sanitised/Dry (e.g. a deliberate N/A) is left alone.
      if (item.stage === "Clean" && next === "DONE") {
        const blankSiblings = items.filter((i) => i.id !== item.id && !currentValue(i));
        setOverrides((prev) => {
          const updated = { ...prev };
          for (const sibling of blankSiblings) updated[sibling.id] = "DONE";
          return updated;
        });
        await Promise.all(blankSiblings.map((sibling) => saveResponse({ inspectionId, checklistItemId: sibling.id, choiceValue: "DONE" })));
      }
    });
  }

  // One attribution line per row, not per button — the most recent of the
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

      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map((item) => {
          const value = currentValue(item);
          const done = value === "DONE";
          const na = value === "NA";
          return (
            <button
              key={item.id}
              type="button"
              disabled={!editable}
              onClick={() => cycle(item)}
              className={cn(
                "flex h-14 items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
                done
                  ? "border-status-pass/40 bg-status-pass-soft text-status-pass"
                  : na
                    ? "border-status-neutral/40 bg-status-neutral-soft text-status-neutral"
                    : "border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
              )}
            >
              {na ? `${item.stage} (N/A)` : item.stage}
            </button>
          );
        })}
      </div>
      {attribution && <p className="mt-2 font-mono-tabular text-[11px] text-muted">{attribution}</p>}
    </div>
  );
}
