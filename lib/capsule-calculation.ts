import type { CalculationDirection } from "@/app/generated/prisma/client";

export const CALCULATION_DIRECTIONS: CalculationDirection[] = [
  "BOTTLES_TO_KG",
  "KG_TO_OUTPUT",
  "BAGGED_KG_TO_OUTPUT",
  "CAPSULES_TO_SHELLS",
  "KG_TO_GUMMY_POUCHES",
  "KG_TO_GUMMY_BOTTLES",
];

export const DIRECTION_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Bottles needed → KG to blend",
  KG_TO_OUTPUT: "KG blended (powder) → Capsules & bottles",
  BAGGED_KG_TO_OUTPUT: "Bagged capsules (KG) → Capsules & bottles",
  CAPSULES_TO_SHELLS: "Capsules → Empty shells needed",
  KG_TO_GUMMY_POUCHES: "Final batch weight (KG) → Gummies & pouches",
  KG_TO_GUMMY_BOTTLES: "Final batch weight (KG) → Gummies & bottles",
};

// The weight figure each direction asks for -- BOTTLES_TO_KG/KG_TO_OUTPUT
// both work from the powder fill weight (what goes inside the shell);
// BAGGED_KG_TO_OUTPUT works from the capsule's average FULL weight (shell +
// fill), since by that stage you're weighing real pressed capsules, not
// powder; CAPSULES_TO_SHELLS works from the empty shell's own weight (no
// fill at all -- it's the reverse direction, going from a capsule count to
// how much empty shell material that requires). See
// CapsuleCalculation.avgWeightMg in schema.prisma -- this is what
// "fill"/"full"/"shell" is derived from when tagging a logged row.
export const WEIGHT_FIELD_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Avg. Fill Weight (mg)",
  KG_TO_OUTPUT: "Avg. Fill Weight (mg)",
  BAGGED_KG_TO_OUTPUT: "Avg. Capsule Full Weight (mg)",
  CAPSULES_TO_SHELLS: "Empty Shell Weight (mg)",
  KG_TO_GUMMY_POUCHES: "Avg. Gummy Weight (mg)",
  KG_TO_GUMMY_BOTTLES: "Avg. Gummy Weight (mg)",
};

export const QUANTITY_FIELD_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Target Bottles",
  KG_TO_OUTPUT: "Blended Powder (kg)",
  BAGGED_KG_TO_OUTPUT: "Bagged Capsules (kg)",
  CAPSULES_TO_SHELLS: "Capsule Count",
  KG_TO_GUMMY_POUCHES: "Final Batch Weight (kg)",
  KG_TO_GUMMY_BOTTLES: "Final Batch Weight (kg)",
};

// The "how many pieces per container" field -- capsules-per-bottle for the
// capsule directions, capsules-per-box for CAPSULES_TO_SHELLS (a bulk
// purchasing box of empty shells), gummies-per-pouch/bottle for the gummy
// directions.
export const PER_CONTAINER_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Capsules per Bottle",
  KG_TO_OUTPUT: "Capsules per Bottle",
  BAGGED_KG_TO_OUTPUT: "Capsules per Bottle",
  CAPSULES_TO_SHELLS: "Capsules per Box",
  KG_TO_GUMMY_POUCHES: "Gummies per Pouch",
  KG_TO_GUMMY_BOTTLES: "Gummies per Bottle",
};

// What resultBottles actually counts -- bottles for the capsule directions,
// boxes of empty shells for CAPSULES_TO_SHELLS, pouches/bottles for the
// gummy directions.
export const CONTAINER_RESULT_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Bottles",
  KG_TO_OUTPUT: "Bottles",
  BAGGED_KG_TO_OUTPUT: "Bottles",
  CAPSULES_TO_SHELLS: "Boxes",
  KG_TO_GUMMY_POUCHES: "Pouches",
  KG_TO_GUMMY_BOTTLES: "Bottles",
};

// What the "pieces produced" result tile/column calls the unit -- gummies
// for the gummy directions, capsules for every other direction.
export const PIECES_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Capsules",
  KG_TO_OUTPUT: "Capsules",
  BAGGED_KG_TO_OUTPUT: "Capsules",
  CAPSULES_TO_SHELLS: "Capsules",
  KG_TO_GUMMY_POUCHES: "Gummies",
  KG_TO_GUMMY_BOTTLES: "Gummies",
};

// Sensible starting values for the per-container/weight fields, seeded when
// a direction is selected -- still fully editable, just saves re-typing the
// common case each time (see calculation-client.tsx).
export const DEFAULT_PER_CONTAINER: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "31",
  KG_TO_OUTPUT: "31",
  BAGGED_KG_TO_OUTPUT: "31",
  CAPSULES_TO_SHELLS: "31",
  KG_TO_GUMMY_POUCHES: "90",
  KG_TO_GUMMY_BOTTLES: "9",
};

export const DEFAULT_AVG_WEIGHT_MG: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "372",
  KG_TO_OUTPUT: "372",
  BAGGED_KG_TO_OUTPUT: "372",
  CAPSULES_TO_SHELLS: "372",
  KG_TO_GUMMY_POUCHES: "4000",
  KG_TO_GUMMY_BOTTLES: "4000",
};

export function weightKind(direction: CalculationDirection): "fill" | "full" | "shell" | "gummy" {
  if (direction === "BAGGED_KG_TO_OUTPUT") return "full";
  if (direction === "CAPSULES_TO_SHELLS") return "shell";
  if (direction === "KG_TO_GUMMY_POUCHES" || direction === "KG_TO_GUMMY_BOTTLES") return "gummy";
  return "fill";
}

// Whether this direction's preview/log should show a capsule-count tile --
// skipped for CAPSULES_TO_SHELLS, where the capsule count is the given
// input, not a computed output (it's just restating what was typed in).
export function showsCapsulesResult(direction: CalculationDirection): boolean {
  return direction !== "CAPSULES_TO_SHELLS";
}

// The kg tile's caption -- only BOTTLES_TO_KG and CAPSULES_TO_SHELLS show a
// kg figure at all (the other two directions take kg as their given input,
// so showing it back as a "result" would just restate what was typed in).
export function kgResultLabel(direction: CalculationDirection): string | null {
  if (direction === "BOTTLES_TO_KG") return "Powder to Blend";
  if (direction === "CAPSULES_TO_SHELLS") return "Shell Weight";
  return null;
}

export type CalculationResult = { resultKg: number; resultCapsules: number; resultBottles: number };

/**
 * Runs one of the capsule/bottle/shell/gummy <-> kg conversions. KG_TO_OUTPUT,
 * BAGGED_KG_TO_OUTPUT, KG_TO_GUMMY_POUCHES, and KG_TO_GUMMY_BOTTLES all fall
 * through to the same kg -> pieces -> containers formula (the generic branch
 * below); they're only kept as separate directions because they use
 * different real-world weight figures and container labels (fill weight vs
 * full weight vs one gummy's weight -- see WEIGHT_FIELD_LABEL). CAPSULES_TO_SHELLS
 * is the reverse (capsules -> weight instead of weight -> capsules), and
 * rounds its container count UP rather than down -- you can round down a
 * partial bottle's worth of loose capsules, but you can't buy a partial box
 * of empty shells. These are theoretical figures (no allowance for spillage,
 * rejects, QC samples, or process yield loss) -- feed in the batch's actual
 * final/weighed output instead of the planned weight to account for that.
 */
export function computeCalculation(
  direction: CalculationDirection,
  inputValue: number,
  capsulesPerBottle: number,
  avgWeightMg: number
): CalculationResult {
  if (direction === "BOTTLES_TO_KG") {
    const bottles = inputValue;
    const capsules = bottles * capsulesPerBottle;
    const kg = (capsules * avgWeightMg) / 1_000_000;
    return { resultKg: kg, resultCapsules: capsules, resultBottles: bottles };
  }

  if (direction === "CAPSULES_TO_SHELLS") {
    const capsules = inputValue;
    const kg = (capsules * avgWeightMg) / 1_000_000;
    const boxes = Math.ceil(capsules / capsulesPerBottle);
    return { resultKg: kg, resultCapsules: capsules, resultBottles: boxes };
  }

  const kg = inputValue;
  const capsules = (kg * 1_000_000) / avgWeightMg;
  const bottles = capsules / capsulesPerBottle;
  return { resultKg: kg, resultCapsules: capsules, resultBottles: bottles };
}

export function formatKg(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatWholeCount(n: number): string {
  return Math.floor(n).toLocaleString();
}
