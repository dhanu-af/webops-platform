import { describe, it, expect } from "vitest";
import { generateMorningReportText } from "./generate-morning-report";

describe("generateMorningReportText", () => {
  it("lists each bay's batches with trolley count and stage", () => {
    const text = generateMorningReportText(
      [{ bayNumber: 1, purpose: "DRYING", batches: [{ productName: "Ashwagandha Extract", batchNumber: "B-100", numberOfTrolleys: 3, currentStage: "DRYING" }] }],
      []
    );
    expect(text).toContain("*Bay 1*");
    expect(text).toContain("*Ashwagandha Extract* – Batch *B-100*");
    expect(text).toContain("3 Trolleys – Drying");
  });

  it("singularizes 'Trolley' for a batch with exactly one", () => {
    const text = generateMorningReportText(
      [{ bayNumber: 1, purpose: "EMPTY", batches: [{ productName: "X", batchNumber: "B-1", numberOfTrolleys: 1, currentStage: "DRYING" }] }],
      []
    );
    expect(text).toContain("1 Trolley –");
    expect(text).not.toContain("1 Trolleys");
  });

  it("shows the bay's purpose label when it has no active batches", () => {
    const text = generateMorningReportText([{ bayNumber: 2, purpose: "RND", batches: [] }], []);
    expect(text).toContain("*Bay 2*");
    expect(text).toContain("R&D");
  });

  it("flags a cleaning-required empty bay distinctly from a plain empty one", () => {
    const text = generateMorningReportText([{ bayNumber: 3, purpose: "CLEANING_REQUIRED", batches: [] }], []);
    expect(text).toContain("Cleaning Required");
  });

  it("omits the Miscellaneous section entirely when there are no misc items", () => {
    const text = generateMorningReportText([{ bayNumber: 1, purpose: "EMPTY", batches: [] }], []);
    expect(text).not.toContain("Miscellaneous");
  });

  it("lists misc items with an optional status suffix", () => {
    const text = generateMorningReportText([], [{ product: "Loose Capsules", quantityLabel: "2 bins", status: "Wrapped" }]);
    expect(text).toContain("*Miscellaneous*");
    expect(text).toContain("Loose Capsules – 2 bins – Wrapped");
  });
});
