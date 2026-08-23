/**
 * Formulation ingredient names are free text and rarely match the Ingredient
 * Library's canonical name byte-for-byte (e.g. "Vitamin C (Ascorbic Acid)"
 * vs the library's "Vitamin C"). Only exact-normalized matches are attempted
 * — loose substring matching risks silently showing the WRONG ingredient's
 * regulatory/safety details, which is worse than reporting no match.
 */
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const DESCRIPTOR_SUFFIXES = /\s*(extract|powder|oil|root|leaf)\s*$/i;

/**
 * Builds the ordered list of normalized candidates to try against the
 * library, most specific first: the raw name, then a descriptor-suffix-
 * stripped version, then (if the name has a trailing parenthetical) the
 * outer and inner parenthetical parts and their own stripped versions.
 */
export function matchCandidates(formulationIngredientName: string): string[] {
  const candidates: string[] = [formulationIngredientName];

  const stripped = formulationIngredientName.replace(DESCRIPTOR_SUFFIXES, "").trim();
  if (stripped) candidates.push(stripped);

  const parenMatch = formulationIngredientName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const outer = parenMatch[1].trim();
    const inner = parenMatch[2].trim();
    if (outer) candidates.push(outer);
    if (inner) candidates.push(inner);
    const strippedOuter = outer.replace(DESCRIPTOR_SUFFIXES, "").trim();
    if (strippedOuter && strippedOuter !== outer) candidates.push(strippedOuter);
  }

  return candidates.map(normalizeForMatch);
}

/** Finds the first library entry (by name) whose normalized name matches any candidate, in order. */
export function findBestMatch<T extends { name: string }>(formulationIngredientName: string, library: T[]): T | null {
  const byNormalizedName = new Map(library.map((entry) => [normalizeForMatch(entry.name), entry]));
  for (const candidate of matchCandidates(formulationIngredientName)) {
    const hit = byNormalizedName.get(candidate);
    if (hit) return hit;
  }
  return null;
}
