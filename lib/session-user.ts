import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";
import { UserFacingError } from "@/lib/user-error";

/**
 * The signed-in user, re-read from the database on every call (URS-02, URS-03).
 *
 * The JWT carries a role and survives until it expires, so trusting it alone
 * would let a deactivated user, or one whose role was just reduced, keep acting
 * for the rest of their session. This returns the live role and rejects
 * deactivated accounts.
 */
export async function requireActiveUser() {
  const session = await auth();
  if (!session?.user) throw new UserFacingError("Not authenticated");
  const user = await withDbRetry(() =>
    db.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, active: true, mustChangePassword: true } })
  );
  if (!user || !user.active) throw new UserFacingError("This account is deactivated. Contact an administrator.");
  if (user.mustChangePassword) throw new UserFacingError("Change your temporary password before continuing.");
  return user;
}

/** Active user who also holds at least one of the given permissions. */
export async function requireUserWithPermission(...permissions: Permission[]) {
  const user = await requireActiveUser();
  if (!permissions.some((p) => can(user.role, p))) {
    throw new UserFacingError(`Forbidden: role ${user.role} cannot perform this action.`);
  }
  return user;
}
