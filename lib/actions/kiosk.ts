"use server";

import { UserFacingError, guard } from "@/lib/user-error";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { signIn, signOut } from "@/lib/auth";
import { headers } from "next/headers";
import { getKioskAccess } from "@/lib/kiosk";
import { PHONE_DEVICE, sha256, signKioskTicket } from "@/lib/kiosk-token";
import { afterWrongPin, canUsePin, checkPin, hashPin, isPinLocked, PIN_LOCK_MINUTES, PIN_MAX_FAILED, pinProblem } from "@/lib/pin";

const CANNOT = "This person cannot sign in with a PIN. Ask a supervisor.";
// Wrong PINs typed on staff phones from one network address (a whole factory shares one Wi-Fi address, so this is
// generous: it is there to stop one place working through many people's PINs), within this window.
const PHONE_WINDOW_MINUTES = 15;
const PHONE_MAX_WRONG = 20;

// A short, non-reversible tag for the network address the request came from, so repeated guessing from one place can be
// counted without storing the address itself.
async function networkTag(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown").split(",")[0].trim();
  return sha256(`${process.env.AUTH_SECRET ?? ""}:${ip}`).slice(0, 12);
}

/**
 * Shop-floor sign-in: the person picks their name, then enters their 4-digit PIN. Only a registered iPad
 * gets this far. Wrong PINs are counted and audited, and five in a row lock that person's PIN for 15 minutes.
 * A temporary PIN (issued by an admin) must be replaced by the person's own PIN the first time.
 */
async function kioskSignIn__impl(input: { userId: string; pin: string; newPin?: string }): Promise<{ status: "signed-in" | "choose-new-pin" }> {
  // A registered iPad, or (unless an admin has switched it off) a staff member's own phone.
  const access = await getKioskAccess();
  if (!access.allowed) throw new UserFacingError("This device is not set up for shop-floor sign-in. Use a registered iPad, or ask an admin.");
  const device = access.device;
  const where = device ? `iPad "${device.name}"` : "a staff phone";
  const net = await networkTag();
  if (!device) {
    // Phones are not registered, so guessing is also limited per network address, on top of the per-person lockout.
    const since = new Date(Date.now() - PHONE_WINDOW_MINUTES * 60_000);
    const wrong = await db.auditLog.count({
      where: { action: "LOGIN_FAILED", createdAt: { gte: since }, AND: [{ reason: { contains: "a staff phone" } }, { reason: { contains: `[net ${net}]` } }] },
    });
    if (wrong >= PHONE_MAX_WRONG) throw new UserFacingError(`Too many wrong PINs from this phone. Try again in ${PHONE_WINDOW_MINUTES} minutes, or use the iPad.`);
  }

  const user = await db.user.findUnique({ where: { id: String(input.userId ?? "") } });
  if (!user || !user.active || !canUsePin(user.role) || !user.pinHash) throw new UserFacingError(CANNOT);

  if (isPinLocked(user.pinLockedUntil)) {
    const minutes = Math.max(1, Math.ceil((user.pinLockedUntil!.getTime() - Date.now()) / 60_000));
    throw new UserFacingError(`Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or ask a supervisor to unlock it.`);
  }

  const pin = String(input.pin ?? "");
  const correct = /^[0-9]{4}$/.test(pin) && (await checkPin(user.id, pin, user.pinHash));
  if (!correct) {
    const next = afterWrongPin(user.pinFailedAttempts);
    await db.user.update({ where: { id: user.id }, data: next });
    await logAudit({
      entityType: "User",
      entityId: user.id,
      action: "LOGIN_FAILED",
      userId: user.id,
      reason: `Wrong PIN on ${where}${next.pinLockedUntil ? `: PIN locked for ${PIN_LOCK_MINUTES} minutes` : ""} [net ${net}]`,
    });
    if (next.pinLockedUntil) throw new UserFacingError(`Wrong PIN. That was the ${PIN_MAX_FAILED}th try, so the PIN is locked for ${PIN_LOCK_MINUTES} minutes. A supervisor can unlock it.`);
    const left = PIN_MAX_FAILED - next.pinFailedAttempts;
    throw new UserFacingError(`Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left.`);
  }

  if (user.pinMustChange) {
    if (!input.newPin) return { status: "choose-new-pin" };
    const problem = pinProblem(String(input.newPin));
    if (problem) throw new UserFacingError(problem);
    if (input.newPin === pin) throw new UserFacingError("Choose a PIN that is different from the temporary one.");
    await db.user.update({
      where: { id: user.id },
      data: { pinHash: await hashPin(user.id, String(input.newPin)), pinMustChange: false, pinSetAt: new Date(), pinFailedAttempts: 0, pinLockedUntil: null },
    });
    await logAudit({ entityType: "User", entityId: user.id, action: "EDITED", userId: user.id, fieldName: "pin", reason: "Shop-floor PIN chosen by the user (replaced the temporary PIN)" });
  } else if (user.pinFailedAttempts > 0 || user.pinLockedUntil) {
    await db.user.update({ where: { id: user.id }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
  }

  await logAudit({ entityType: "User", entityId: user.id, action: "LOGIN", userId: user.id, reason: `PIN sign-in on ${device ? `shop-floor iPad "${device.name}"` : "a staff phone"} [net ${net}]` });

  try {
    await signIn("pin", { ticket: signKioskTicket(user.id, device?.id ?? PHONE_DEVICE), redirect: false });
  } catch {
    throw new UserFacingError("Could not sign in. Try again.");
  }
  return { status: "signed-in" };
}

/** Ends the shop-floor session and returns to the iPad's start screen. */
async function kioskSignOut__impl(reason: "done" | "idle" = "done") {
  await signOut({ redirectTo: reason === "idle" ? "/k?idle=1" : "/k?done=1" });
}

// Callable from the browser forms. Returns the message of any UserFacingError as data
// (production hides the text of a thrown server-action error); see lib/actions-client/.
export async function kioskSignIn(...args: Parameters<typeof kioskSignIn__impl>) {
  return guard(() => kioskSignIn__impl(...args));
}

export async function kioskSignOut(...args: Parameters<typeof kioskSignOut__impl>) {
  return guard(() => kioskSignOut__impl(...args));
}
