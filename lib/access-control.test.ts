import { describe, it, expect } from "vitest";
import { can } from "./permissions";
import { validatePassword, PASSWORD_MIN_LENGTH } from "./password-policy";
import type { UserRole } from "@/app/generated/prisma/client";

// URS-02: role-based access -- operators enter records, supervisors/QA verify
// them, admins manage users and templates, and nobody holds both entry and
// verification rights.
describe("URS-02 role-based access", () => {
  const enters = (r: UserRole) => can(r, "inspection.submit") && can(r, "inspection.create");
  const verifies = (r: UserRole) => can(r, "inspection.verify.supervisor") || can(r, "inspection.verify.qa");

  it("lets an Operator enter records but not verify or administer", () => {
    expect(enters("OPERATOR")).toBe(true);
    expect(verifies("OPERATOR")).toBe(false);
    expect(can("OPERATOR", "users.manage")).toBe(false);
    expect(can("OPERATOR", "checklist.manage")).toBe(false);
  });

  it("lets a Supervisor and QA verify but not enter records", () => {
    expect(can("SUPERVISOR", "inspection.verify.supervisor")).toBe(true);
    expect(can("QA", "inspection.verify.qa")).toBe(true);
    expect(enters("SUPERVISOR")).toBe(false);
    expect(enters("QA")).toBe(false);
  });

  it("lets an Admin manage users and checklist templates but neither enter nor verify records", () => {
    expect(can("ADMIN", "users.manage")).toBe(true);
    expect(can("ADMIN", "checklist.manage")).toBe(true);
    expect(enters("ADMIN")).toBe(false);
    expect(verifies("ADMIN")).toBe(false);
  });

  it("gives read-only roles no way to write records", () => {
    for (const role of ["VIEWER", "MANAGEMENT"] as UserRole[]) {
      expect(enters(role)).toBe(false);
      expect(verifies(role)).toBe(false);
    }
  });

  it("lets QA read the audit trail", () => {
    expect(can("QA", "reports.view")).toBe(true);
  });
});

describe("URS-01 password rules", () => {
  it("rejects short, single-class and common passwords", () => {
    expect(validatePassword("Short1!")).not.toEqual([]);
    expect(validatePassword("alllowercaseletters")).not.toEqual([]);
    expect(validatePassword("Password1234!")).not.toEqual([]); // contains "password"
  });

  it("rejects passwords containing the user's name or email", () => {
    expect(validatePassword("Dhanushka#2026x", { name: "Dhanushka K" })).toContain("Don't include your name in the password.");
    expect(validatePassword("jordan.blake-Secure9", { email: "jordan.blake@example.com" }).join(" ")).toMatch(/email/);
  });

  it("accepts a strong password", () => {
    expect(validatePassword("river-Plank-47-lamp", { email: "a@b.com", name: "Zed" })).toEqual([]);
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(10);
  });
});
