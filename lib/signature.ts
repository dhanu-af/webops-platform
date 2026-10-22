import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { UserFacingError } from "@/lib/user-error";

/**
 * Electronic signature check (URS-09): the signer must re-enter their own
 * password at the moment of signing, even though they are already logged in.
 * A wrong password is itself recorded in the audit trail, so repeated attempts
 * to sign as someone else's session are visible to QA.
 */
export async function verifySignaturePassword(userId: string, password: string | undefined, what: string) {
  if (!password) throw new UserFacingError("Re-enter your password to sign.");
  const row = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) {
    await logAudit({ entityType: "User", entityId: userId, action: "SIGNATURE_FAILED", userId, reason: `Wrong password while signing: ${what}` });
    throw new UserFacingError("Password incorrect — the signature was not applied.");
  }
}
