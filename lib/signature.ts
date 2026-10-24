import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { afterFailedLogin, isLocked, LOCK_MINUTES } from "@/lib/login-throttle";
import { UserFacingError } from "@/lib/user-error";

/**
 * Electronic signature check (URS-09): the signer must re-enter their own
 * password at the moment of signing, even though they are already logged in.
 * A wrong password is itself recorded in the audit trail, so repeated attempts
 * to sign as someone else's session are visible to QA. Wrong passwords count
 * towards the same lockout as sign-in, so a borrowed session cannot be used to
 * guess a colleague's password.
 */
export async function verifySignaturePassword(userId: string, password: string | undefined, what: string) {
  if (!password) throw new UserFacingError("Re-enter your password to sign.");
  const row = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, failedLogins: true, lockedUntil: true } });
  if (isLocked(row.lockedUntil)) {
    throw new UserFacingError(`Too many wrong passwords. Signing is locked for up to ${LOCK_MINUTES} minutes.`);
  }
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) {
    await db.user.update({ where: { id: userId }, data: afterFailedLogin(row.failedLogins ?? 0) });
    await logAudit({ entityType: "User", entityId: userId, action: "SIGNATURE_FAILED", userId, reason: `Wrong password while signing: ${what}` });
    throw new UserFacingError("Password incorrect — the signature was not applied.");
  }
  if ((row.failedLogins ?? 0) > 0) await db.user.update({ where: { id: userId }, data: { failedLogins: 0, lockedUntil: null } });
}
