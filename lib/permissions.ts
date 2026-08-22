import type { UserRole } from "@/app/generated/prisma/client";

// Segregation of duties (spec §26, §40) — server-side authorisation only.
// Never trust a client-side role check for anything that mutates data.

export type Permission =
  | "view"
  | "inspection.create"
  | "inspection.submit"
  | "inspection.verify.supervisor"
  | "inspection.verify.qa"
  | "area.release"
  | "checklist.manage"
  | "areas.manage"
  | "calibration.manage"
  | "users.manage"
  | "reports.view"
  | "reports.export";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "view",
    "inspection.create",
    "inspection.submit",
    "inspection.verify.supervisor",
    "inspection.verify.qa",
    "area.release",
    "checklist.manage",
    "areas.manage",
    "calibration.manage",
    "users.manage",
    "reports.view",
    "reports.export",
  ],
  ADMIN: [
    "view",
    "checklist.manage",
    "areas.manage",
    "calibration.manage",
    "users.manage",
    "reports.view",
    "reports.export",
  ],
  OPERATOR: ["view", "inspection.create", "inspection.submit"],
  TEAM_LEADER: ["view", "inspection.create", "inspection.submit", "inspection.verify.supervisor"],
  SUPERVISOR: ["view", "inspection.verify.supervisor", "reports.view"],
  QA: ["view", "inspection.verify.qa", "area.release", "calibration.manage", "reports.view", "reports.export"],
  MANAGEMENT: ["view", "reports.view", "reports.export"],
  VIEWER: ["view"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: UserRole, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error(`Forbidden: role ${role} lacks permission "${permission}"`);
  }
}

// An operator can never verify their own inspection (spec §21, §26) — this
// holds regardless of role permissions, since a Team Leader/Supervisor might
// also be the operator who performed the check on a short-staffed shift.
export function canVerifyOwnWork(actorId: string, operatorId: string | null): boolean {
  return actorId !== operatorId;
}
