/// The Batch Calculator's math — shared by the client-side live preview and
/// the PDF export route so the two can never drift out of sync.

/** Mass units the calculator can auto-convert between, expressed relative to 1 mg. */
export const UNIT_TO_MG: Record<string, number> = { mg: 1, g: 1000, kg: 1_000_000 };

export function canConvertUnit(unit: string): boolean {
  return unit.trim().toLowerCase() in UNIT_TO_MG;
}

/** Sensible unit choices for the calculator's unit selector given a formulation's base unit. */
export function unitOptionsFor(baseUnit: string): string[] {
  return canConvertUnit(baseUnit) ? ["mg", "g", "kg"] : [baseUnit];
}

export type CalcIngredient = {
  id: string;
  ingredientName: string;
  baseQty: number;
  tolerancePct: number;
};

export type BatchRow = CalcIngredient & {
  pctWw: number;
  calculatedQty: number;
  roundedQty: number;
  minQty: number;
  maxQty: number;
};

/**
 * Scales a formulation's recipe to a required batch size in a given unit.
 *
 * 1. Each ingredient's %w/w = baseQty / totalQty.
 * 2. The required batch size is converted into the formulation's base unit
 *    (via the mg-denominated lookup table) if the calculator's unit differs.
 * 3. calculatedQty = %w/w × requiredBatchSize (in calc unit), rounded to 3dp;
 *    roundedQty is that rounded again to 2dp for a practical weigh-out figure.
 * 4. minQty/maxQty = calculatedQty × (1 ± tolerancePct/100).
 *
 * Only mg/g/kg are supported for conversion — if the formulation's base unit
 * isn't one of those, the calculator locks to that unit (unitFactor stays 1).
 */
export function calculateBatch(
  ingredients: CalcIngredient[],
  baseUnit: string,
  requiredBatchSize: number,
  calcUnit: string
): { rows: BatchRow[]; totalQty: number; batchTotal: number; unitFactor: number } {
  const totalQty = ingredients.reduce((s, i) => s + i.baseQty, 0);

  const baseUnitKey = baseUnit.trim().toLowerCase();
  const calcUnitKey = calcUnit.trim().toLowerCase();
  const canConvert = canConvertUnit(baseUnit) && calcUnitKey in UNIT_TO_MG;
  // Ratio of "1 unit of calcUnit" to "1 unit of the formulation's base unit" — 1 when they match.
  const unitFactor = canConvert ? UNIT_TO_MG[calcUnitKey] / UNIT_TO_MG[baseUnitKey] : 1;

  const requiredBatchSizeInBaseUnit = requiredBatchSize * unitFactor;

  const rows: BatchRow[] = ingredients.map((ing) => {
    const pctWw = totalQty > 0 ? ing.baseQty / totalQty : 0;
    const calculatedQtyRawInBaseUnit = pctWw * requiredBatchSizeInBaseUnit;
    const calculatedQtyRaw = unitFactor > 0 ? calculatedQtyRawInBaseUnit / unitFactor : calculatedQtyRawInBaseUnit;
    const calculatedQty = Math.round(calculatedQtyRaw * 1000) / 1000;
    const roundedQty = Math.round(calculatedQty * 100) / 100;
    const minQty = calculatedQty * (1 - ing.tolerancePct / 100);
    const maxQty = calculatedQty * (1 + ing.tolerancePct / 100);
    return { ...ing, pctWw, calculatedQty, roundedQty, minQty, maxQty };
  });

  const batchTotal = rows.reduce((s, r) => s + r.roundedQty, 0);

  return { rows, totalQty, batchTotal, unitFactor };
}
