type ItemShape = { id: string; prompt: string; helpText: string | null; type: string; required: boolean };

export type RenderRow<T extends ItemShape> =
  | { kind: "single"; item: T }
  | { kind: "equipment-triplet"; equipmentName: string; helpText: string | null; items: [T, T, T] };

const STAGES = ["Clean", "Sanitised", "Dry"] as const;

// Clusters three consecutive ACKNOWLEDGEMENT items shaped "<Equipment> — Clean"
// / "— Sanitised" / "— Dry" (see seed.ts's equipmentGroup()) into one row, so
// they render as a single card with three checkboxes instead of three
// separate cards repeating the same equipment name and instructions.
export function buildChecklistRenderRows<T extends ItemShape>(items: T[]): RenderRow<T>[] {
  const rows: RenderRow<T>[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    const suffix = ` — ${STAGES[0]}`;
    if (item.type === "ACKNOWLEDGEMENT" && item.prompt.endsWith(suffix)) {
      const base = item.prompt.slice(0, -suffix.length);
      const next1 = items[i + 1];
      const next2 = items[i + 2];
      if (
        next1?.type === "ACKNOWLEDGEMENT" &&
        next1.prompt === `${base} — ${STAGES[1]}` &&
        next2?.type === "ACKNOWLEDGEMENT" &&
        next2.prompt === `${base} — ${STAGES[2]}`
      ) {
        rows.push({ kind: "equipment-triplet", equipmentName: base, helpText: item.helpText, items: [item, next1, next2] });
        i += 3;
        continue;
      }
    }
    rows.push({ kind: "single", item });
    i += 1;
  }
  return rows;
}
