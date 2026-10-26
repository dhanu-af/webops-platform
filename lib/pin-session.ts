import { db } from "@/lib/db";
import { canUsePin, PIN_SESSION_MAX_MINUTES } from "@/lib/pin";

type SessionUser = { authMethod?: "password" | "pin"; authAt?: number; kioskDeviceId?: string | null };
type LiveUser = { role: string; active: boolean; pinSetAt: Date | null };

/**
 * Whether a shop-floor PIN session may still be used, or the reason it may not. A password session always
 * passes. Checked on every action and page, from the live database row, so the end of a session takes effect
 * at once when a device is revoked, a PIN is changed or reset, or the person leaves.
 */
export async function pinSessionProblem(session: SessionUser, user: LiveUser): Promise<string | null> {
  if (session.authMethod !== "pin") return null;
  if (!user.active) return "This account is deactivated. Contact an administrator.";
  if (!canUsePin(user.role)) return "Shop-floor PIN sign-in is not available for your role. Sign in with your password.";
  if (Date.now() - (session.authAt ?? 0) > PIN_SESSION_MAX_MINUTES * 60_000) return "Your shop-floor session ended. Pick your name and enter your PIN again.";
  if (user.pinSetAt && user.pinSetAt.getTime() > (session.authAt ?? 0)) return "Your PIN was changed. Pick your name and enter your PIN again.";
  if (!session.kioskDeviceId) {
    // signed in from a staff phone: valid only while an admin allows phones
    const { getCachedKioskAllowAnyPhone } = await import("@/lib/cached-config");
    return (await getCachedKioskAllowAnyPhone()) ? null : "Signing in with a PIN on a phone has been switched off. Use a shop-floor iPad.";
  }
  const device = await db.kioskDevice.findUnique({ where: { id: session.kioskDeviceId }, select: { revokedAt: true } });
  if (!device || device.revokedAt) return "This iPad is no longer set up for shop-floor sign-in.";
  return null;
}
