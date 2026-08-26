import type { CalculationDirection } from "@/app/generated/prisma/client";

export const CALCULATION_DIRECTIONS: CalculationDirection[] = [
  "BOTTLES_TO_KG",
  "KG_TO_OUTPUT",
  "BAGGED_KG_TO_OUTPUT",
  "CAPSULES_TO_SHELLS",
  "KG_TO_GUMMY_POUCHES",
  "KG_TO_GUMMY_BOTTLES",
  "KG_TO_POUCHES_BY_WEIGHT",
  "POUCHES_TO_KG_BY_WEIGHT",
];

export const DIRECTION_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Bottles needed → KG to blend",
  KG_TO_OUTPUT: "KG blended (powder) → Capsules & bottles",
  BAGGED_KG_TO_OUTPUT: "Bagged capsules (KG) → Capsules & bottles",
  CAPSULES_TO_SHELLS: "Capsules → Empty shells needed",
  KG_TO_GUMMY_POUCHES: "Final batch weight (KG) → Gummies & pouches",
  KG_TO_GUMMY_BOTTLES: "Final batch weight (KG) → Gummies & bottles",
  // The alternative to KG_TO_GUMMY_POUCHES: instead of piece count + weight
  // per gummy, you know the pouch's own fill weight directly (e.g. "360g
  // pouches") -- skips the gummy-piece-count step entirely.
  KG_TO_POUCHES_BY_WEIGHT: "Final batch weight (KG) → Pouches (by pouch weight)",
  // The reverse: a target pouch count -> how many kg of batch to produce,
  // using the same pouch fill weight.
  POUCHES_TO_KG_BY_WEIGHT: "Pouches needed (by pouch weight) → KG to produce",
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
  KG_TO_GUMMY_POUCHES: "Avg. Gummy Weight (g)",
  KG_TO_GUMMY_BOTTLES: "Avg. Gummy Weight (g)",
  KG_TO_POUCHES_BY_WEIGHT: "Pouch Fill Weight (g)",
  POUCHES_TO_KG_BY_WEIGHT: "Pouch Fill Weight (g)",
};

const GRAM_DIRECTIONS: CalculationDirection[] = ["KG_TO_GUMMY_POUCHES", "KG_TO_GUMMY_BOTTLES", "KG_TO_POUCHES_BY_WEIGHT", "POUCHES_TO_KG_BY_WEIGHT"];

// The unit the weight field is entered/displayed in -- capsules are tiny
// enough that mg is the natural unit, gummies/pouches are heavy enough
// (several grams to hundreds of grams) that mg would mean typing "4000" for
// a 4g gummy or "360000" for a 360g pouch, so those directions use grams
// instead. `CapsuleCalculation.avgWeightMg` always stores milligrams
// regardless -- see toAvgWeightMg/fromAvgWeightMg below for the conversion
// at the UI boundary.
export function weightFieldUnit(direction: CalculationDirection): "mg" | "g" {
  return GRAM_DIRECTIONS.includes(direction) ? "g" : "mg";
}

// Converts a value the user typed into the weight field (already in that
// direction's own display unit) into the milligrams computeCalculation and
// the DB column expect.
export function toAvgWeightMg(direction: CalculationDirection, displayValue: number): number {
  return weightFieldUnit(direction) === "g" ? displayValue * 1000 : displayValue;
}

// The inverse of toAvgWeightMg -- turns a stored `avgWeightMg` (always
// milligrams) back into the direction's own display unit, for re-rendering
// a logged row.
export function fromAvgWeightMg(direction: CalculationDirection, mg: number): number {
  return weightFieldUnit(direction) === "g" ? mg / 1000 : mg;
}

export const QUANTITY_FIELD_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Target Bottles",
  KG_TO_OUTPUT: "Blended Powder (kg)",
  BAGGED_KG_TO_OUTPUT: "Bagged Capsules (kg)",
  CAPSULES_TO_SHELLS: "Capsule Count",
  KG_TO_GUMMY_POUCHES: "Final Batch Weight (kg)",
  KG_TO_GUMMY_BOTTLES: "Final Batch Weight (kg)",
  KG_TO_POUCHES_BY_WEIGHT: "Final Batch Weight (kg)",
  POUCHES_TO_KG_BY_WEIGHT: "Target Pouches",
};

// The "how many pieces per container" field -- capsules-per-bottle for the
// capsule directions, capsules-per-box for CAPSULES_TO_SHELLS (a bulk
// purchasing box of empty shells), gummies-per-pouch/bottle for the gummy
// directions. Not applicable to KG_TO_POUCHES_BY_WEIGHT -- see
// showsPerContainerField.
export const PER_CONTAINER_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Capsules per Bottle",
  KG_TO_OUTPUT: "Capsules per Bottle",
  BAGGED_KG_TO_OUTPUT: "Capsules per Bottle",
  CAPSULES_TO_SHELLS: "Capsules per Box",
  KG_TO_GUMMY_POUCHES: "Gummies per Pouch",
  KG_TO_GUMMY_BOTTLES: "Gummies per Bottle",
  KG_TO_POUCHES_BY_WEIGHT: "Pouches per Box",
  POUCHES_TO_KG_BY_WEIGHT: "Pouches per Box",
};

const NO_PER_CONTAINER_DIRECTIONS: CalculationDirection[] = ["KG_TO_POUCHES_BY_WEIGHT", "POUCHES_TO_KG_BY_WEIGHT"];

// Whether the "pieces per container" field is a meaningful input for this
// direction -- false for the by-pouch-weight directions, which go straight
// between total weight and pouch count (a pouch's own fill weight already IS
// the per-container figure, entered via the weight field instead). The
// field is hidden and silently fixed to 1 for these directions (see
// calculation-client.tsx) so the shared kg -> pieces -> containers formula
// still applies without a second division/multiplication.
export function showsPerContainerField(direction: CalculationDirection): boolean {
  return !NO_PER_CONTAINER_DIRECTIONS.includes(direction);
}

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
  KG_TO_POUCHES_BY_WEIGHT: "Pouches",
  POUCHES_TO_KG_BY_WEIGHT: "Pouches",
};

// What the "pieces produced" result tile/column calls the unit -- gummies
// for the gummy directions, capsules for every other direction. Unused for
// KG_TO_POUCHES_BY_WEIGHT (see showsCapsulesResult).
export const PIECES_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Capsules",
  KG_TO_OUTPUT: "Capsules",
  BAGGED_KG_TO_OUTPUT: "Capsules",
  CAPSULES_TO_SHELLS: "Capsules",
  KG_TO_GUMMY_POUCHES: "Gummies",
  KG_TO_GUMMY_BOTTLES: "Gummies",
  KG_TO_POUCHES_BY_WEIGHT: "Pouches",
  POUCHES_TO_KG_BY_WEIGHT: "Pouches",
};

// Sensible starting values for the per-container/weight fields, seeded when
// a direction is selected -- still fully editable, just saves re-typing the
// common case each time (see calculation-client.tsx). KG_TO_POUCHES_BY_WEIGHT's
// per-container default of "1" is what makes the shared formula (which
// divides by it) a no-op for that direction -- the field itself is hidden.
export const DEFAULT_PER_CONTAINER: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "31",
  KG_TO_OUTPUT: "31",
  BAGGED_KG_TO_OUTPUT: "31",
  CAPSULES_TO_SHELLS: "31",
  KG_TO_GUMMY_POUCHES: "90",
  KG_TO_GUMMY_BOTTLES: "9",
  KG_TO_POUCHES_BY_WEIGHT: "1",
  POUCHES_TO_KG_BY_WEIGHT: "1",
};

// In each direction's own display unit (see weightFieldUnit) -- mg for the
// capsule directions, grams for the gummy/pouch directions (a 4g gummy or a
// 360g pouch, not 4000mg/360000mg).
export const DEFAULT_AVG_WEIGHT_DISPLAY: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "372",
  KG_TO_OUTPUT: "372",
  BAGGED_KG_TO_OUTPUT: "372",
  CAPSULES_TO_SHELLS: "372",
  KG_TO_GUMMY_POUCHES: "4",
  KG_TO_GUMMY_BOTTLES: "4",
  KG_TO_POUCHES_BY_WEIGHT: "360",
  POUCHES_TO_KG_BY_WEIGHT: "360",
};

export function weightKind(direction: CalculationDirection): "fill" | "full" | "shell" | "gummy" | "pouch" {
  if (direction === "BAGGED_KG_TO_OUTPUT") return "full";
  if (direction === "CAPSULES_TO_SHELLS") return "shell";
  if (direction === "KG_TO_GUMMY_POUCHES" || direction === "KG_TO_GUMMY_BOTTLES") return "gummy";
  if (direction === "KG_TO_POUCHES_BY_WEIGHT" || direction === "POUCHES_TO_KG_BY_WEIGHT") return "pouch";
  return "fill";
}

const NO_PIECES_RESULT_DIRECTIONS: CalculationDirection[] = ["CAPSULES_TO_SHELLS", "KG_TO_POUCHES_BY_WEIGHT", "POUCHES_TO_KG_BY_WEIGHT"];

// Whether this direction's preview/log should show a "pieces produced"
// tile -- skipped for CAPSULES_TO_SHELLS, where the capsule count is the
// given input rather than a computed output, and for the by-pouch-weight
// directions, which have no piece-count concept at all (they work directly
// in pouches).
export function showsCapsulesResult(direction: CalculationDirection): boolean {
  return !NO_PIECES_RESULT_DIRECTIONS.includes(direction);
}

// The kg tile's caption -- only shown for directions that compute kg as a
// result rather than take it as the given input (the reverse of
// showsCapsulesResult's "pieces" tile: BOTTLES_TO_KG, CAPSULES_TO_SHELLS, and
// POUCHES_TO_KG_BY_WEIGHT all go target-count -> kg; every other direction
// goes kg -> count, so showing kg back as a "result" would just restate
// what was typed in).
export function kgResultLabel(direction: CalculationDirection): string | null {
  if (direction === "BOTTLES_TO_KG") return "Powder to Blend";
  if (direction === "CAPSULES_TO_SHELLS") return "Shell Weight";
  if (direction === "POUCHES_TO_KG_BY_WEIGHT") return "Batch Weight Needed";
  return null;
}

export type CalculationResult = { resultKg: number; resultCapsules: number; resultBottles: number };

/**
 * Runs one of the capsule/bottle/shell/gummy/pouch <-> kg conversions.
 * KG_TO_OUTPUT, BAGGED_KG_TO_OUTPUT, KG_TO_GUMMY_POUCHES, KG_TO_GUMMY_BOTTLES,
 * and KG_TO_POUCHES_BY_WEIGHT all fall through to the same kg -> pieces ->
 * containers formula (the generic branch below); they're only kept as
 * separate directions because they use different real-world weight figures
 * and container labels (fill weight vs full weight vs one gummy's weight vs
 * a pouch's own weight -- see WEIGHT_FIELD_LABEL). BOTTLES_TO_KG and its
 * pouch-weight reverse POUCHES_TO_KG_BY_WEIGHT share the opposite direction
 * (target count -> kg), and CAPSULES_TO_SHELLS is the same reverse shape but
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
  if (direction === "BOTTLES_TO_KG" || direction === "POUCHES_TO_KG_BY_WEIGHT") {
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
