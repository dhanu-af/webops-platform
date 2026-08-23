import { describe, it, expect } from "vitest";
import { calculateBatch, canConvertUnit, unitOptionsFor } from "./formulation-calc";

const ingredients = [
  { id: "1", ingredientName: "A", baseQty: 6, tolerancePct: 2 },
  { id: "2", ingredientName: "B", baseQty: 4, tolerancePct: 5 },
];

describe("canConvertUnit / unitOptionsFor", () => {
  it("supports mg/g/kg", () => {
    expect(canConvertUnit("kg")).toBe(true);
    expect(canConvertUnit("KG")).toBe(true);
    expect(canConvertUnit("mg")).toBe(true);
  });

  it("locks to the base unit when it isn't mg/g/kg", () => {
    expect(canConvertUnit("L")).toBe(false);
    expect(unitOptionsFor("L")).toEqual(["L"]);
  });

  it("offers all three units when convertible", () => {
    expect(unitOptionsFor("kg")).toEqual(["mg", "g", "kg"]);
  });
});

describe("calculateBatch", () => {
  it("computes %w/w from base quantities", () => {
    const { rows, totalQty } = calculateBatch(ingredients, "kg", 10, "kg");
    expect(totalQty).toBe(10);
    expect(rows[0].pctWw).toBeCloseTo(0.6);
    expect(rows[1].pctWw).toBeCloseTo(0.4);
  });

  it("scales to a required batch size in the same unit", () => {
    const { rows, batchTotal } = calculateBatch(ingredients, "kg", 20, "kg");
    expect(rows[0].calculatedQty).toBeCloseTo(12);
    expect(rows[1].calculatedQty).toBeCloseTo(8);
    expect(batchTotal).toBeCloseTo(20);
  });

  it("converts the required batch size into the base unit first", () => {
    // A 20000g required batch is the same as 20kg -- same %w/w split as the
    // "scales to a required batch size" case above, just expressed in g.
    const { rows } = calculateBatch(ingredients, "kg", 20000, "g");
    expect(rows[0].calculatedQty).toBeCloseTo(12000);
    expect(rows[1].calculatedQty).toBeCloseTo(8000);
  });

  it("locks to the base unit with no conversion when the base unit isn't mg/g/kg", () => {
    const { rows } = calculateBatch(ingredients, "L", 20, "L");
    expect(rows[0].calculatedQty).toBeCloseTo(12);
  });

  it("computes min/max from tolerancePct", () => {
    const { rows } = calculateBatch(ingredients, "kg", 10, "kg");
    // Ingredient A: calculatedQty 6, tolerance 2% -> 5.88 / 6.12
    expect(rows[0].minQty).toBeCloseTo(5.88);
    expect(rows[0].maxQty).toBeCloseTo(6.12);
    // Ingredient B: calculatedQty 4, tolerance 5% -> 3.8 / 4.2
    expect(rows[1].minQty).toBeCloseTo(3.8);
    expect(rows[1].maxQty).toBeCloseTo(4.2);
  });

  it("rounds calculatedQty to 3dp and roundedQty to 2dp", () => {
    const [a] = [{ id: "1", ingredientName: "A", baseQty: 1, tolerancePct: 2 }];
    const { rows } = calculateBatch([a], "kg", 3, "kg");
    // totalQty=1, pctWw=1, calculatedQty = 1 * 3 = 3 exactly -- use a case with more decimals
    expect(rows[0].calculatedQty).toBe(3);

    const uneven = calculateBatch(
      [
        { id: "1", ingredientName: "A", baseQty: 1, tolerancePct: 2 },
        { id: "2", ingredientName: "B", baseQty: 2, tolerancePct: 2 },
      ],
      "kg",
      7,
      "kg"
    );
    // totalQty=3, pctWw(A)=1/3, calculatedQty = 7/3 = 2.3333... -> rounds to 2.333
    expect(uneven.rows[0].calculatedQty).toBe(2.333);
    expect(uneven.rows[0].roundedQty).toBe(2.33);
  });

  it("returns zero percentages without dividing by zero when there are no ingredients", () => {
    const { rows, totalQty } = calculateBatch([], "kg", 10, "kg");
    expect(rows).toEqual([]);
    expect(totalQty).toBe(0);
  });
});
