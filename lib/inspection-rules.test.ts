import { describe, it, expect } from "vitest";
import {
  changedFields,
  failuresMissingCorrectiveAction,
  isAnswered,
  missingHeaderFields,
  numericVerdict,
  signatureMeaning,
  unansweredRequiredItems,
  unsignedCorrectiveActionCount,
  verifierConflict,
  type RuleItem,
} from "./inspection-rules";
import { recordStatus } from "./record-status";

const item = (over: Partial<RuleItem>): RuleItem => ({ id: "i1", prompt: "Q", type: "PASS_FAIL", required: true, minValue: null, maxValue: null, ...over });
const resp = (over: Record<string, unknown> = {}) => ({ passFail: null, numericValue: null, textValue: null, choiceValue: null, ...over }) as never;

describe("URS-02 segregation of duties", () => {
  it("blocks the operator from verifying their own record", () => {
    expect(verifierConflict({ actorId: "u1", operatorId: "u1", responderIds: [] })).toMatch(/performed yourself/);
  });

  it("blocks anyone who entered an answer on the record, even if not the operator of record", () => {
    expect(verifierConflict({ actorId: "sup", operatorId: "op", responderIds: ["op", "sup"] })).toMatch(/entered answers/);
  });

  it("allows an independent verifier", () => {
    expect(verifierConflict({ actorId: "sup", operatorId: "op", responderIds: ["op"] })).toBeNull();
    expect(verifierConflict({ actorId: "sup", operatorId: null, responderIds: [] })).toBeNull();
  });
});

describe("URS-05 required fields cannot be blank", () => {
  it("treats a missing response as unanswered", () => {
    expect(isAnswered(item({}), undefined)).toBe(false);
  });

  it("treats an empty saved row as unanswered for every answer type", () => {
    for (const type of ["PASS_FAIL", "YES_NO", "NUMERIC", "TEXT", "ACKNOWLEDGEMENT", "MULTIPLE_CHOICE"]) {
      expect(isAnswered(item({ type }), resp())).toBe(false);
    }
    expect(isAnswered(item({ type: "TEXT" }), resp({ textValue: "   " }))).toBe(false);
  });

  it("accepts a real answer for each type", () => {
    expect(isAnswered(item({ type: "PASS_FAIL" }), resp({ passFail: "PASS" }))).toBe(true);
    expect(isAnswered(item({ type: "NUMERIC" }), resp({ numericValue: 0 }))).toBe(true); // zero is a valid reading
    expect(isAnswered(item({ type: "TEXT" }), resp({ textValue: "ok" }))).toBe(true);
    expect(isAnswered(item({ type: "ACKNOWLEDGEMENT" }), resp({ choiceValue: "DONE" }))).toBe(true);
    expect(isAnswered(item({ type: "MULTIPLE_CHOICE" }), resp({ choiceValue: "Yes / Met" }))).toBe(true);
  });

  it("lists only required, unanswered items and ignores optional ones", () => {
    const items = [item({ id: "a" }), item({ id: "b", required: false }), item({ id: "c" })];
    const answers = new Map([["a", resp({ passFail: "PASS" })]]);
    expect(unansweredRequiredItems(items, answers).map((i) => i.id)).toEqual(["c"]);
  });

  it("requires previous and next product/batch for line clearance and allergen changeover only", () => {
    const blank = { product: null, batchNumber: null, previousProduct: null, previousBatchNumber: null, areaId: "area" };
    expect(missingHeaderFields("LINE_CLEARANCE", blank)).toEqual(["Previous product", "Previous batch", "Next product", "Next batch"]);
    expect(missingHeaderFields("ALLERGEN_CHANGEOVER", blank)).toHaveLength(4);
    expect(missingHeaderFields("POST_OPERATION_CLEANING", blank)).toEqual([]);
    expect(missingHeaderFields("PRE_START", { ...blank, areaId: null })).toEqual(["Area / line"]);
  });

  it("does not demand an area for facility-level checklists (generator, facility open/close)", () => {
    const blank = { product: null, batchNumber: null, previousProduct: null, previousBatchNumber: null, areaId: null };
    expect(missingHeaderFields("FACILITY_GENERATOR", blank)).toEqual([]);
  });
});

describe("URS-07 / URS-08 failures need corrective action and release is blocked", () => {
  it("flags failed items that have no corrective action", () => {
    const failures = failuresMissingCorrectiveAction([
      { passFail: "FAIL", prompt: "Floor clean", finding: { correctiveAction: null } },
      { passFail: "FAIL", prompt: "Drain clear", finding: { correctiveAction: { status: "OPEN" } } },
      { passFail: "PASS", prompt: "Walls", finding: null },
      { passFail: "FAIL", prompt: "No finding row at all", finding: null },
    ]);
    expect(failures).toEqual(["Floor clean", "No finding row at all"]);
  });

  it("counts corrective actions that are not yet signed off by a verifier", () => {
    expect(
      unsignedCorrectiveActionCount([
        { correctiveAction: null },
        { correctiveAction: { status: "OPEN", verifiedById: null } },
        { correctiveAction: { status: "CLOSED", verifiedById: null } }, // closed without a verifier doesn't count as signed off
        { correctiveAction: { status: "CLOSED", verifiedById: "qa1" } },
      ])
    ).toBe(2);
  });

  it("flags a measured value outside its acceptable range as FAIL (chemical concentration)", () => {
    const sanitiser = { minValue: 200, maxValue: 400 };
    expect(numericVerdict(sanitiser, 199)).toBe("FAIL");
    expect(numericVerdict(sanitiser, 401)).toBe("FAIL");
    expect(numericVerdict(sanitiser, 200)).toBeNull();
    expect(numericVerdict(sanitiser, 400)).toBeNull();
    expect(numericVerdict({ minValue: null, maxValue: 5 }, 100)).toBe("FAIL");
    expect(numericVerdict({ minValue: null, maxValue: null }, 100)).toBeNull();
  });
});

describe("URS-09 signature meaning", () => {
  it("maps each decision to the meaning stored with the signature", () => {
    expect(signatureMeaning("APPROVE", false)).toBe("Verified");
    expect(signatureMeaning("APPROVE", true)).toBe("Approved");
    expect(signatureMeaning("RETURN", true)).toBe("Returned");
    expect(signatureMeaning("REJECT", false)).toBe("Rejected");
  });
});

describe("URS-10 record status", () => {
  it("maps workflow statuses onto Draft / Submitted / Verified / Rejected", () => {
    expect(recordStatus("IN_PROGRESS")).toBe("Draft");
    expect(recordStatus("RETURNED")).toBe("Draft");
    expect(recordStatus("AWAITING_SUPERVISOR")).toBe("Submitted");
    expect(recordStatus("AWAITING_QA")).toBe("Submitted");
    expect(recordStatus("CLOSED")).toBe("Verified");
    expect(recordStatus("REJECTED")).toBe("Rejected");
  });
});

describe("URS-11 / URS-12 field-level change capture", () => {
  it("reports old and new value for each changed field only", () => {
    const changes = changedFields({ passFail: "PASS", comment: null, textValue: "a" }, { passFail: "FAIL", comment: "dirty", textValue: "a" });
    expect(changes).toEqual([
      { field: "passFail", oldValue: "PASS", newValue: "FAIL" },
      { field: "comment", oldValue: null, newValue: "dirty" },
    ]);
  });

  it("ignores fields that were not part of the update and treats empty string like null", () => {
    expect(changedFields({ comment: null, passFail: "PASS" }, { comment: "", passFail: undefined })).toEqual([]);
  });

  it("treats a first answer as a change from nothing", () => {
    expect(changedFields(null, { numericValue: 12 })).toEqual([{ field: "numericValue", oldValue: null, newValue: 12 }]);
  });
});
