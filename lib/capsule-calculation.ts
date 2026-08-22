import type { CalculationDirection } from "@/app/generated/prisma/client";

export const CALCULATION_DIRECTIONS: CalculationDirection[] = ["BOTTLES_TO_KG", "KG_TO_OUTPUT", "BAGGED_KG_TO_OUTPUT"];

export const DIRECTION_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Bottles needed → KG to blend",
  KG_TO_OUTPUT: "KG blended (powder) → Capsules & bottles",
  BAGGED_KG_TO_OUTPUT: "Bagged capsules (KG) → Capsules & bottles",
};

// The weight figure each direction asks for -- BOTTLES_TO_KG/KG_TO_OUTPUT
// both work from the powder fill weight (what goes inside the shell);
// BAGGED_KG_TO_OUTPUT works from the capsule's average FULL weight (shell +
// fill), since by that stage you're weighing real pressed capsules, not
// powder. See CapsuleCalculation.avgWeightMg in schema.prisma -- this is
// what "fill" vs "full" is derived from when tagging a logged row.
export const WEIGHT_FIELD_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Avg. Fill Weight (mg)",
  KG_TO_OUTPUT: "Avg. Fill Weight (mg)",
  BAGGED_KG_TO_OUTPUT: "Avg. Capsule Full Weight (mg)",
};

export const QUANTITY_FIELD_LABEL: Record<CalculationDirection, string> = {
  BOTTLES_TO_KG: "Target Bottles",
  KG_TO_OUTPUT: "Blended Powder (kg)",
  BAGGED_KG_TO_OUTPUT: "Bagged Capsules (kg)",
};

export function weightKind(direction: CalculationDirection): "fill" | "full" {
  return direction === "BAGGED_KG_TO_OUTPUT" ? "full" : "fill";
}

export type CalculationResult = { resultKg: number; resultCapsules: number; resultBottles: number };

/**
 * Runs one of the three capsule/bottle <-> kg conversions. KG_TO_OUTPUT and
 * BAGGED_KG_TO_OUTPUT are the identical kg -> capsules -> bottles
 * calculation; they're only kept as separate directions because they use a
 * different real-world weight figure (fill weight vs full weight -- see
 * WEIGHT_FIELD_LABEL). These are theoretical figures (no allowance for
 * spillage, rejects, QC samples, or process yield loss) -- a real batch
 * will use somewhat more powder / produce somewhat fewer good capsules
 * than this shows.
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
