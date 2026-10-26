// Super Admin accounts are not shown to anyone else, and only a Super Admin can create or change one. (The audit
// trail still names who did what: records must stay attributable.)
export const canSeeSuperAdmins = (viewerRole: string) => viewerRole === "SUPER_ADMIN";

/** A Prisma `where` for user lists: everyone, except Super Admins unless the viewer is one. */
export function visibleUsersWhere(viewerRole: string) {
  return canSeeSuperAdmins(viewerRole) ? {} : { role: { not: "SUPER_ADMIN" as const } };
}
