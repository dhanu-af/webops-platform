import { describe, expect, it } from "vitest";
import { assertBatchOpen, checkOff, signOff } from "./mfg-signoff";

const operator = { id: "u1", name: "Olive Operator", role: "OPERATOR" as const };
const supervisor = { id: "u2", name: "Sam Supervisor", role: "SUPERVISOR" as const };
const T0 = new Date("2026-10-20T01:00:00Z");

describe("manufacturing sign-offs", () => {
  it("stamps the signed-in user and server time, never the text typed", () => {
    const r = signOff(operator, null, "Somebody Else");
    expect(r.name).toBe("Olive Operator");
    expect(r.at).toBeInstanceOf(Date);
  });

  it("keeps the first sign-off: it cannot be handed to someone else or erased from the form", () => {
    const existing = { name: "Olive Operator", at: T0 };
    expect(signOff(supervisor, existing, "Sam Supervisor")).toEqual(existing);
    expect(signOff(supervisor, existing, "")).toEqual(existing);
    expect(signOff(supervisor, existing, null)).toEqual(existing);
  });

  it("records nothing when nothing was typed", () => {
    expect(signOff(operator, null, "  ")).toEqual({ name: null, at: null });
  });

  it("only a Supervisor/QA level role can check a stage", () => {
    expect(() => checkOff(operator, null, "x", "Someone Else")).toThrow(/Only a Supervisor or QA/);
    expect(checkOff(supervisor, null, "x", "Olive Operator").name).toBe("Sam Supervisor");
  });

  it("the person who completed a stage cannot also check it", () => {
    expect(() => checkOff(supervisor, null, "x", "Sam Supervisor")).toThrow(/cannot also check/);
  });

  it("a completed batch is locked", () => {
    expect(() => assertBatchOpen({ status: "COMPLETED", batchNumber: "B1" })).toThrow(/locked/);
    expect(() => assertBatchOpen({ status: "IN_PROGRESS", batchNumber: "B1" })).not.toThrow();
  });
});
