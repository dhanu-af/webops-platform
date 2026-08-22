import type { UserRole } from "@/app/generated/prisma/client";

// Section-floor staff (Operator/Team Leader/Supervisor) only see tasks for
// their own assigned area(s) when at least one is set on their account -
// everyone else (QA/Management/Admin/etc.), and any of these three roles
// left with zero areas assigned (e.g. a facility-wide "Production
// Supervisor" rather than a specific area's supervisor), sees every area
// and can filter down manually.
const AREA_SCOPED_ROLES: UserRole[] = ["OPERATOR", "TEAM_LEADER", "SUPERVISOR"];

export type UserScope =
  | { scoped: false }
  | { scoped: true; facilityId: string; sectionIds: string[]; areaIds: string[] };

export function getUserScope(user: {
  role: UserRole;
  areaIds: string[];
  sectionIds: string[];
  facilityId: string | null;
}): UserScope {
  if (AREA_SCOPED_ROLES.includes(user.role) && user.areaIds.length > 0 && user.facilityId) {
    return { scoped: true, facilityId: user.facilityId, sectionIds: user.sectionIds, areaIds: user.areaIds };
  }
  return { scoped: false };
}

// Prisma `where` fragment matching any record whose own facility/section/area
// scope *includes* one of the user's areas -- an exact area match, a
// section-wide record in one of the user's sections, or a facility-wide
// record in the user's facility. Spread into any query that already filters
// by facilityId/sectionId/areaId (ChecklistSchedule, Inspection,
// CorrectiveAction, etc.). Returns `{}` (no restriction) for an unscoped user.
export function scopeWhere(scope: UserScope) {
  if (!scope.scoped) return {};
  return {
    OR: [
      { areaId: { in: scope.areaIds } },
      { areaId: null, sectionId: { in: scope.sectionIds } },
      { areaId: null, sectionId: null, facilityId: scope.facilityId },
    ],
  };
}
