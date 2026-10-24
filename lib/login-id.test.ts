import { describe, expect, it } from "vitest";
import { normalizeLoginId, validateLoginId } from "@/lib/login-id";

describe("login IDs", () => {
  it("normalises case and surrounding spaces", () => {
    expect(normalizeLoginId("  Dhanu.K ")).toBe("dhanu.k");
  });
  it("accepts sensible IDs", () => {
    for (const id of ["dhanu", "emp-00123", "j.blake", "qa_officer1"]) expect(validateLoginId(id)).toBeNull();
  });
  it("rejects too short, too long, spaces, symbols and email-like input", () => {
    expect(validateLoginId("ab")).not.toBeNull();
    expect(validateLoginId("a".repeat(33))).not.toBeNull();
    expect(validateLoginId("two words")).not.toBeNull();
    expect(validateLoginId("a@b.com")).not.toBeNull();
    expect(validateLoginId("-leading")).not.toBeNull();
  });
});
