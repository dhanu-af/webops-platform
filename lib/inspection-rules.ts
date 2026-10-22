import type { ResponseValue } from "@/app/generated/prisma/client";

// Pure record-integrity rules for inspections, kept free of database and
// framework code so they can be unit-tested directly (URS-02, 05, 07, 08).

export type RuleItem = {
  id: string;
  prompt: string;
  type: string;
  required: boolean;
  minValue: number | null;
  maxValue: number | null;
};

export type RuleResponse =
  | {
      passFail: ResponseValue | null;
      numericValue: number | null;
      textValue: string | null;
      choiceValue: string | null;
    }
  | null
  | undefined;

/** Does this response actually contain an answer, not just exist as a row? (URS-05) */
export function isAnswered(item: RuleItem, response: RuleResponse): boolean {
  if (!response) return false;
  switch (item.type) {
    case "PASS_FAIL":
    case "YES_NO":
    case "NA":
      return response.passFail !== null && response.passFail !== undefined;
    case "NUMERIC":
      return response.numericValue !== null && response.numericValue !== undefined && Number.isFinite(response.numericValue);
    case "TEXT":
      return !!response.textValue?.trim();
    case "ACKNOWLEDGEMENT":
      return response.choiceValue === "DONE" || response.choiceValue === "NA";
    case "MULTIPLE_CHOICE":
      return !!response.choiceValue?.trim() || response.passFail === "NA";
    default:
      // PHOTO and anything added later: the photo itself is the answer.
      return true;
  }
}

/** Required items that have no real answer yet. A blank required field blocks submission. */
export function unansweredRequiredItems(items: RuleItem[], responseByItem: Map<string, RuleResponse>): RuleItem[] {
  return items.filter((i) => i.required && !isAnswered(i, responseByItem.get(i.id)));
}

/**
 * A measured value outside the item's acceptable range is a FAIL (URS-08, e.g.
 * a chemical concentration). Returns null when in range or when no range is set;
 * callers use null to mean "no pass/fail recorded", never a silent PASS.
 */
export function numericVerdict(item: Pick<RuleItem, "minValue" | "maxValue">, value: number): "FAIL" | null {
  if (!Number.isFinite(value)) return null;
  if (item.minValue !== null && item.minValue !== undefined && value < item.minValue) return "FAIL";
  if (item.maxValue !== null && item.maxValue !== undefined && value > item.maxValue) return "FAIL";
  return null;
}

type FailedResponse = {
  passFail: ResponseValue | null;
  prompt: string;
  finding: { correctiveAction: { status: string } | null } | null;
};

/** Failed items that have no corrective action entry yet -- the operator can't submit until each has one (URS-07). */
export function failuresMissingCorrectiveAction(responses: FailedResponse[]): string[] {
  return responses.filter((r) => r.passFail === "FAIL" && !r.finding?.correctiveAction).map((r) => r.prompt);
}

type CorrectiveActionState = { status: string; verifiedById: string | null };

/** Corrective actions still waiting for a Supervisor/QA sign-off. While any exist, the line is not released (URS-07). */
export function unsignedCorrectiveActionCount(findings: Array<{ correctiveAction: CorrectiveActionState | null }>): number {
  return findings.filter((f) => f.correctiveAction && !(f.correctiveAction.status === "CLOSED" && f.correctiveAction.verifiedById)).length;
}

/**
 * Why this user may not verify/sign this record, or null if they may (URS-02).
 * Nobody signs off work they did: not the operator, and not anyone who entered
 * any individual answer on it (a supervisor who "helped" fill it in is still
 * a participant).
 */
export function verifierConflict(args: { actorId: string; operatorId: string | null; responderIds: string[] }): string | null {
  if (args.operatorId && args.actorId === args.operatorId) return "You cannot verify an inspection you performed yourself.";
  if (args.responderIds.includes(args.actorId)) return "You entered answers on this record, so you cannot verify it.";
  return null;
}

/** Checklist categories whose records must capture the previous and next product/batch (URS-04). */
export const CATEGORIES_NEEDING_PRODUCT_CHANGEOVER = ["LINE_CLEARANCE", "ALLERGEN_CHANGEOVER"] as const;

export function needsProductChangeover(category: string): boolean {
  return (CATEGORIES_NEEDING_PRODUCT_CHANGEOVER as readonly string[]).includes(category);
}

/** Missing record-header fields for this category; empty when complete (URS-04, URS-05). */
export function missingHeaderFields(
  category: string,
  header: { product: string | null; batchNumber: string | null; previousProduct: string | null; previousBatchNumber: string | null; areaId: string | null }
): string[] {
  const missing: string[] = [];
  if (!header.areaId) missing.push("Area / line");
  if (needsProductChangeover(category)) {
    if (!header.previousProduct?.trim()) missing.push("Previous product");
    if (!header.previousBatchNumber?.trim()) missing.push("Previous batch");
    if (!header.product?.trim()) missing.push("Next product");
    if (!header.batchNumber?.trim()) missing.push("Next batch");
  }
  return missing;
}

/** Signature meaning stored with a verification (URS-09). */
export function signatureMeaning(action: "APPROVE" | "RETURN" | "REJECT", isFinalStep: boolean): "Verified" | "Approved" | "Returned" | "Rejected" {
  if (action === "RETURN") return "Returned";
  if (action === "REJECT") return "Rejected";
  return isFinalStep ? "Approved" : "Verified";
}

/**
 * Field-by-field difference between what a record held and what it is being
 * changed to (URS-11, URS-12). Only fields present in `after` are compared, so
 * a partial update can't look like it blanked the others; null and "" count as
 * the same "empty" so re-saving an untouched field isn't logged as an edit.
 */
export function changedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const norm = (v: unknown) => (v === undefined || v === "" ? null : v);
  const out: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  for (const [field, next] of Object.entries(after)) {
    if (next === undefined) continue;
    const prev = norm(before?.[field]);
    if (prev !== norm(next)) out.push({ field, oldValue: prev, newValue: norm(next) });
  }
  return out;
}
