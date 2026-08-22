import type { CalculationDirection } from "@/app/generated/prisma/client";

export const CALCULATION_DIRECTIONS: CalculationDirection[] = ["BOTTLES_TO_KG", "KG_TO_OUTPUT", "BAGGED_KG_TO_OUTPUT", "CAPSULES_TO_SHELLS"];

export const DIRECTION_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Bottles needed → KG to blend",
  KG_TO_OUTPUT: "KG blended (powder) → Capsules & bottles",
  BAGGED_KG_TO_OUTPUT: "Bagged capsules (KG) → Capsules & bottles",
  CAPSULES_TO_SHELLS: "Capsules → Empty shells needed",
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
};

export const QUANTITY_FIELD_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Target Bottles",
  KG_TO_OUTPUT: "Blended Powder (kg)",
  BAGGED_KG_TO_OUTPUT: "Bagged Capsules (kg)",
  CAPSULES_TO_SHELLS: "Capsule Count",
};

// The "how many capsules per container" field -- capsules-per-bottle for
// every direction except CAPSULES_TO_SHELLS, where the container is a bulk
// purchasing box of empty shells instead of a finished bottle.
export const PER_CONTAINER_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Capsules per Bottle",
  KG_TO_OUTPUT: "Capsules per Bottle",
  BAGGED_KG_TO_OUTPUT: "Capsules per Bottle",
  CAPSULES_TO_SHELLS: "Capsules per Box",
};

// What resultBottles actually counts -- bottles for every direction except
// CAPSULES_TO_SHELLS, where it's boxes of empty shells.
export const CONTAINER_RESULT_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Bottles",
  KG_TO_OUTPUT: "Bottles",
  BAGGED_KG_TO_OUTPUT: "Bottles",
  CAPSULES_TO_SHELLS: "Boxes",
};

export function weightKind(direction: CalculationDirection): "fill" | "full" | "shell" {
  if (direction === "BAGGED_KG_TO_OUTPUT") return "full";
  if (direction === "CAPSULES_TO_SHELLS") return "shell";
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
 * Runs one of the four capsule/bottle/shell <-> kg conversions. KG_TO_OUTPUT
 * and BAGGED_KG_TO_OUTPUT are the identical kg -> capsules -> bottles
 * calculation; they're only kept as separate directions because they use a
 * different real-world weight figure (fill weight vs full weight -- see
 * WEIGHT_FIELD_LABEL). CAPSULES_TO_SHELLS is the reverse of those two
 * (capsules -> weight instead of weight -> capsules), and rounds its
 * container count UP rather than down -- you can round down a partial
 * bottle's worth of loose capsules, but you can't buy a partial box of
 * empty shells. These are theoretical figures (no allowance for spillage,
 * rejects, QC samples, or process yield loss) -- a real batch will use
 * somewhat more material / produce somewhat fewer good units than this
 * shows.
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
