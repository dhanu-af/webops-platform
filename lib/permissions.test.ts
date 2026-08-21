import { describe, it, expect } from "vitest";
import { can, requirePermission, canVerifyOwnWork, type Permission } from "./permissions";
import type { UserRole } from "@/app/generated/prisma/client";

// Regression guard for the segregation-of-duties matrix (spec §26, §40) —
// every admin page and server action in this app is gated through can()/
// requirePermission(), so a silent edit to this matrix is a real security
// bug, not just a test failure. This pins the exact current matrix so any
// future change to it is a deliberate, visible diff here, not a surprise.
const EXPECTED_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "view",
    "inspection.create",
    "inspection.submit",
    "inspection.verify.supervisor",
    "inspection.verify.qa",
    "area.release",
    "checklist.manage",
    "areas.manage",
    "users.manage",
    "reports.view",
    "reports.export",
  ],
  ADMIN: ["view", "checklist.manage", "areas.manage", "users.manage", "reports.view", "reports.export"],
  OPERATOR: ["view", "inspection.create", "inspection.submit"],
  TEAM_LEADER: ["view", "inspection.create", "inspection.submit", "inspection.verify.supervisor"],
  SUPERVISOR: ["view", "inspection.verify.supervisor", "reports.view"],
  QA: ["view", "inspection.verify.qa", "area.release", "reports.view", "reports.export"],
  MANAGEMENT: ["view", "reports.view", "reports.export"],
  VIEWER: ["view"],
};

const ALL_ROLES = Object.keys(EXPECTED_PERMISSIONS) as UserRole[];
const ALL_PERMISSIONS: Permission[] = [
  "view",
  "inspection.create",
  "inspection.submit",
  "inspection.verify.supervisor",
  "inspection.verify.qa",
  "area.release",
  "checklist.manage",
  "areas.manage",
  "users.manage",
  "reports.view",
  "reports.export",
];

describe("can()", () => {
  for (const role of ALL_ROLES) {
    for (const permission of ALL_PERMISSIONS) {
      const expected = EXPECTED_PERMISSIONS[role].includes(permission);
      it(`${role} ${expected ? "has" : "does not have"} "${permission}"`, () => {
        expect(can(role, permission)).toBe(expected);
      });
    }
  }

  it("never grants a permission to an unrecognised role", () => {
    expect(can("NOT_A_REAL_ROLE" as UserRole, "view")).toBe(false);
  });

  it("OPERATOR cannot verify inspections (segregation of duties)", () => {
    expect(can("OPERATOR", "inspection.verify.supervisor")).toBe(false);
    expect(can("OPERATOR", "inspection.verify.qa")).toBe(false);
  });

  it("ADMIN cannot perform or verify inspections directly", () => {
    expect(can("ADMIN", "inspection.create")).toBe(false);
    expect(can("ADMIN", "inspection.verify.supervisor")).toBe(false);
    expect(can("ADMIN", "inspection.verify.qa")).toBe(false);
  });

  it("only SUPER_ADMIN and ADMIN can manage checklists, areas, or users", () => {
    for (const role of ALL_ROLES) {
      const expected = role === "SUPER_ADMIN" || role === "ADMIN";
      expect(can(role, "checklist.manage")).toBe(expected);
      expect(can(role, "areas.manage")).toBe(expected);
      expect(can(role, "users.manage")).toBe(expected);
    }
  });
});

describe("requirePermission()", () => {
  it("does not throw when the role holds the permission", () => {
    expect(() => requirePermission("SUPER_ADMIN", "users.manage")).not.toThrow();
  });

  it("throws with the role and permission named, when the role lacks it", () => {
    expect(() => requirePermission("OPERATOR", "users.manage")).toThrow(/OPERATOR.*users\.manage/);
  });
});

describe("canVerifyOwnWork()", () => {
  it("is false when the actor is the operator", () => {
    expect(canVerifyOwnWork("user-1", "user-1")).toBe(false);
  });

  it("is true when the actor is a different person", () => {
    expect(canVerifyOwnWork("user-1", "user-2")).toBe(true);
  });

  it("is true when there is no recorded operator", () => {
    expect(canVerifyOwnWork("user-1", null)).toBe(true);
  });
});
