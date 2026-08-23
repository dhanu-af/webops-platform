import { describe, it, expect } from "vitest";
import { matchCandidates, findBestMatch } from "./ingredient-match";

describe("matchCandidates", () => {
  it("normalizes case and punctuation on the raw name", () => {
    expect(matchCandidates("D-Mannose")).toContain("dmannose");
  });

  it("tries a descriptor-suffix-stripped version", () => {
    expect(matchCandidates("Cranberry Extract")).toContain("cranberry");
  });

  it("tries the outer and inner parts of a trailing parenthetical", () => {
    const candidates = matchCandidates("Vitamin C (Ascorbic Acid)");
    expect(candidates).toContain("vitaminc");
    expect(candidates).toContain("ascorbicacid");
  });

  it("puts the raw name first so an exact match always wins", () => {
    expect(matchCandidates("Tongkat Ali (Eurycoma longifolia)")[0]).toBe("tongkatalieurycomalongifolia");
  });
});

describe("findBestMatch", () => {
  const library = [{ name: "Vitamin C" }, { name: "Cranberry Extract" }, { name: "Tongkat Ali" }];

  it("matches an exact library name", () => {
    expect(findBestMatch("Cranberry Extract", library)?.name).toBe("Cranberry Extract");
  });

  it("matches via the parenthetical outer part when the exact name doesn't match", () => {
    expect(findBestMatch("Vitamin C (Ascorbic Acid)", library)?.name).toBe("Vitamin C");
  });

  it("matches a descriptor-stripped candidate against a library entry without the descriptor", () => {
    expect(findBestMatch("Tongkat Ali (Eurycoma longifolia)", library)?.name).toBe("Tongkat Ali");
  });

  it("returns null when nothing matches, rather than guessing", () => {
    expect(findBestMatch("Completely Unknown Thing", library)).toBeNull();
  });
});
