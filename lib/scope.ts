import type { UserRole } from "@/app/generated/prisma/client";

// Section-floor staff (Operator/Team Leader/Supervisor) only see tasks for
// their own assigned area when one is set on their account - everyone else
// (QA/Management/Admin/etc.), and any of these three roles left unassigned
// (e.g. a facility-wide "Production Supervisor" rather than a specific
// area's supervisor), sees every area and can filter down manually.
const AREA_SCOPED_ROLES: UserRole[] = ["OPERATOR", "TEAM_LEADER", "SUPERVISOR"];

export type UserScope =
  | { scoped: false }
  | { scoped: true; facilityId: string; sectionId: string | null; areaId: string };

export function getUserScope(user: {
  role: UserRole;
  areaId: string | null;
  sectionId: string | null;
  facilityId: string | null;
}): UserScope {
  if (AREA_SCOPED_ROLES.includes(user.role) && user.areaId && user.facilityId) {
    return { scoped: true, facilityId: user.facilityId, sectionId: user.sectionId, areaId: user.areaId };
  }
  return { scoped: false };
}

// Prisma `where` fragment matching any record whose own facility/section/area
// scope *includes* the user's area — an exact area match, a section-wide
// record in the user's section, or a facility-wide record in the user's
// facility. Spread into any query that already filters by facilityId/
// sectionId/areaId (ChecklistSchedule, Inspection, CorrectiveAction, etc.).
// Returns `{}` (no restriction) for an unscoped user.
export function scopeWhere(scope: UserScope) {
  if (!scope.scoped) return {};
  return {
    OR: [
      { areaId: scope.areaId },
      { areaId: null, sectionId: scope.sectionId },
      { areaId: null, sectionId: null, facilityId: scope.facilityId },
    ],
  };
}
